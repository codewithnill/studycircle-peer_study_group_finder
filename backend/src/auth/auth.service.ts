// import: these tools make the error replies. conflictexception gives a 409 reply. unauthorizedexception gives a 401 reply.
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
// import: bcrypt scrambles (hashes) passwords and checks a password against a stored hash.
// the default import style works because "esModuleInterop" is on in tsconfig.json.
import bcrypt from 'bcrypt';
// import: randomBytes makes random data. it is used to build a fake password for the timing trick in login.
import { randomBytes } from 'node:crypto';
// import: prismaservice is the one shared database connection.
import { PrismaService } from '../prisma/prisma.service';
// import: "Prisma" gives the transaction type. "UserStatus" holds the fixed words active and suspended.
// safety: the fixed words come from the generated client and are never typed by hand.
import { Prisma, UserStatus } from '../generated/prisma/client';
// import: the users service owns every query on the users table. this file never reads that table directly.
import { OwnUser, SafeUser, UsersService } from '../users/users.service';
// import: the token service makes and checks tokens.
import { TokenService } from './token.service';
// import: the two input shapes that the controller has already checked.
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// how much work bcrypt does for one hash. 12 means about a quarter of a second.
// it is slow on purpose, so guessing passwords by machine takes a very long time.
export const BCRYPT_ROUNDS = 12;

// the one message for every failed login: wrong email, wrong password, suspended, or deleted.
// safety: a different message for each case would tell an attacker which emails have an account.
export const INVALID_CREDENTIALS_MESSAGE = 'email or password is not correct';

// the one message for every refresh that is refused.
export const INVALID_SESSION_MESSAGE = 'the session is not valid. please log in again';

// what login gives back to the controller.
// the two tokens are raw values. the controller puts them in cookies and never in the json reply.
export interface LoginResult {
  user: OwnUser;
  accessToken: string;
  refreshToken: string;
}

// what refresh gives back to the controller. the controller puts both tokens in cookies.
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

// checks whether a database error means "this value is already used" (prisma error code P2002).
// the check looks at the error code only, so this file does not depend on the shape of prisma's error class.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// this service holds the logic of register, login, refresh, and logout.
// it does not know about http, cookies, or guards. the controller handles those (thin controller, fat service).
export class AuthService {
  // a fake password hash, used only when a login email is unknown. it is made once, when first needed.
  private dummyHash?: Promise<string>;

  // the constructor receives the three helpers from nestjs.
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  // creates a student account and returns the safe fields. it sets no cookies (the person logs in next).
  async register(dto: RegisterDto): Promise<SafeUser> {
    // scramble the password first. the real password is never saved and never leaves this function.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      // the users service saves the account. it always uses the student role. there is no role field in the input.
      return await this.users.createStudent({
        name: dto.name,
        email: dto.email,
        passwordHash,
        department: dto.department,
        academicYear: dto.academicYear,
      });
    } catch (error) {
      // the database refuses a second account with the same email (unique rule).
      if (isUniqueViolation(error)) {
        // an exact message is needed here, or the person cannot fix the form.
        // the login rate limit (a later step) limits how fast someone can try many emails.
        throw new ConflictException('this email is already registered');
      }
      // any other error is a real problem. pass it on so the filter hides the details from the reply.
      throw error;
    }
  }

  // checks the email and password. on success it makes both tokens and saves the refresh token's hash.
  async login(dto: LoginDto): Promise<LoginResult> {
    // find a live account. a deleted account is not found, because the users service hides it.
    const user = await this.users.findForLogin(dto.email);

    // when the email is unknown, compare against a fake hash anyway.
    // safety: without this, an unknown email would answer faster than a wrong password.
    // the time difference would show an attacker which emails have an account.
    const hashToCheck = user ? user.passwordHash : await this.getDummyHash();
    const passwordMatches = await bcrypt.compare(dto.password, hashToCheck);

    // every kind of failure ends here with the same message and the same status code.
    // a suspended person is refused only after the password check, so the timing stays the same too.
    if (!user || !passwordMatches || user.status !== UserStatus.active) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    // make the short access token and a new random refresh token.
    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    const refreshToken = this.tokens.generateRefreshToken();
    // save only the hash of the refresh token.
    await this.saveRefreshToken(this.prisma, user.id, refreshToken);

    // read the person's own data (with the email) so the frontend can show the name at once.
    const own = await this.users.findOwnById(user.id);
    // the account could have been deleted a moment ago. treat it like any other failed login.
    if (!own) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return { user: own, accessToken, refreshToken };
  }

  // swaps a refresh token for a new access token and a new refresh token (rotation).
  // every refresh token can be used only once.
  async refresh(rawToken: string | undefined): Promise<RefreshResult> {
    // no cookie means no session.
    if (!rawToken) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    // the database holds only hashes, so the cookie value is hashed before the search.
    const tokenHash = this.tokens.hashRefreshToken(rawToken);
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    // an unknown token is refused.
    if (!row) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    // safety: a cancelled token must never come back. it may have been stolen, or it may be an old browser tab.
    // the server cannot tell which one it is, so every refresh token of this person is cancelled.
    if (row.revokedAt) {
      await this.revokeAllForUser(row.userId);
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    // an expired token is refused.
    if (row.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    // the account must still be live and active. this is how a suspension stops refreshing at once.
    const user = await this.users.findAuthStateById(row.userId);
    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    // rotate in one database transaction: cancel the old token and save the new one together.
    // the function returns null (and does not throw) when the race is lost.
    // safety: the cancel-all step below must run outside the transaction. a throw inside would roll it back.
    const newRefreshToken = await this.prisma.$transaction(async (tx) => {
      // cancel the old token only if it is still active. the check and the change are one single query.
      // when two requests use the same token at the same moment, only one of them changes a row.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // the other request won. this request used a token that is already cancelled.
      if (count === 0) {
        return null;
      }

      // make and save the new refresh token.
      const fresh = this.tokens.generateRefreshToken();
      await this.saveRefreshToken(tx, user.id, fresh);
      return fresh;
    });

    // the race was lost, so treat it like the reuse of a cancelled token.
    if (newRefreshToken === null) {
      await this.revokeAllForUser(row.userId);
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    // the role is read from the database now, so a role change takes effect at the next refresh.
    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, refreshToken: newRefreshToken };
  }

  // cancels the refresh token of the current browser. it never fails, so a person can always log out.
  async logout(rawToken: string | undefined): Promise<void> {
    // no cookie means there is nothing to cancel.
    if (!rawToken) {
      return;
    }

    // cancel the token only if it exists and is still active. an unknown token changes nothing.
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.tokens.hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // saves the hash of a new refresh token. the client can be the normal connection or a transaction client.
  // safety: only the hash is saved, never the raw token.
  private async saveRefreshToken(
    client: Pick<Prisma.TransactionClient, 'refreshToken'>,
    userId: number,
    rawToken: string,
  ): Promise<void> {
    await client.refreshToken.create({
      data: {
        userId,
        tokenHash: this.tokens.hashRefreshToken(rawToken),
        expiresAt: this.tokens.refreshTokenExpiresAt(),
      },
    });
  }

  // cancels every active refresh token of one person. this logs the person out on every device.
  private async revokeAllForUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // gives the fake hash for the timing trick in login. it is made once and then reused.
  // it uses the same bcrypt cost as new accounts, so the time is close to a real check.
  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
    return this.dummyHash;
  }
}