// import: "Injectable" marks a class so nestjs can create it and hand it to other classes.
import { Injectable } from '@nestjs/common';
// import: configservice reads values from the .env file.
import { ConfigService } from '@nestjs/config';
// import: jwtservice signs and checks json web tokens (jwt).
import { JwtService } from '@nestjs/jwt';
// import: two tools from node's built-in crypto library. "randomBytes" makes unguessable random data. "createHash" makes a one-way scrambled copy.
import { createHash, randomBytes } from 'node:crypto';
// import: the fixed role words from the generated client, so no role is typed by hand.
import { Role } from '../generated/prisma/client';
// import: the token numbers and rules from the constants file.
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ALGORITHM,
  MIN_JWT_SECRET_LENGTH,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';

// what is written inside the access token.
// "sub" (subject) is the standard name for "who this token is about". jwt keeps it as text, so the user id is written as text.
// safety: a jwt is only encoded, not encrypted. anyone who holds it can read it. so the email and other personal data never go in.
export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

// what the rest of the app receives after a token passed every check.
export interface VerifiedAccessToken {
  userId: number;
  role: Role;
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// this service makes and checks tokens. it does not talk to the database and it does not know about cookies.
// that keeps it small and easy to test (single responsibility).
export class TokenService {
  // the secret that signs and checks access tokens. it is read once, when the app starts.
  private readonly secret: string;

  // the constructor receives the jwt tool and the config reader from nestjs.
  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    // read the secret from the environment.
    const secret = config.get<string>('JWT_ACCESS_SECRET');

    // safety: stop the app at once when the secret is missing or too short.
    // a weak secret lets an attacker guess it and make fake tokens for any user, even an admin.
    // the message never prints the secret itself.
    if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `JWT_ACCESS_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters. add a long random value to backend/.env.`,
      );
    }

    // keep the checked secret for later use.
    this.secret = secret;
  }

  // makes a short-lived access token for one user.
  async signAccessToken(userId: number, role: Role): Promise<string> {
    // only the user id and the role go inside. no email, no name.
    const payload: AccessTokenPayload = { sub: String(userId), role };

    return this.jwt.signAsync(payload, {
      // the secret that proves the token was made by this server.
      secret: this.secret,
      // the signing method is named, so it is always the same one.
      algorithm: JWT_ALGORITHM,
      // the token stops working after this many seconds.
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  // checks an access token. returns the user id and role when every check passes, otherwise null.
  // it never says why a token failed, so nothing useful leaks to an attacker.
  async verifyAccessToken(token: string): Promise<VerifiedAccessToken | null> {
    // holds the content of the token after the signature and the expiry date were checked.
    let payload: Partial<AccessTokenPayload>;

    try {
      payload = await this.jwt.verifyAsync<Partial<AccessTokenPayload>>(token, {
        secret: this.secret,
        // safety: only the named method is accepted. a forged token that says "no signature" (alg: none) is refused.
        algorithms: [JWT_ALGORITHM],
      });
    } catch {
      // a bad signature, a wrong secret, an expired token, or a broken text all end up here.
      return null;
    }

    // the user id was written as text, so turn it back into a number and check it is a real id.
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      return null;
    }

    // check that the role is one of the fixed words from the schema.
    const role = payload.role;
    if (!role || !Object.values(Role).includes(role)) {
      return null;
    }

    return { userId, role };
  }

  // makes a new random refresh token.
  // 48 random bytes cannot be guessed. "base64url" writes them as safe text (letters, digits, - and _).
  // the raw value goes to the browser cookie only. it is never saved in the database.
  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  // makes the scrambled copy of a refresh token that is saved in the database (refresh_tokens.token_hash).
  // safety: only the hash is stored, so a stolen database cannot be used to log in.
  // sha-256 is used and not bcrypt, because the token is long and random and cannot be guessed.
  // bcrypt is slow on purpose to protect weak human passwords, and that cost is not needed here.
  hashRefreshToken(token: string): string {
    // the same token always gives the same hash, so a later lookup by hash works.
    return createHash('sha256').update(token).digest('hex');
  }

  // gives the date and time when a refresh token made now stops working.
  refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  }
}