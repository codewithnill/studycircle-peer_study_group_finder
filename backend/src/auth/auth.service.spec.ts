// imports: the two error types that the service throws.
import { ConflictException, UnauthorizedException } from '@nestjs/common';
// import: real bcrypt is used in the tests. the default import style matches the service, so a spy on it sees the service's calls.
import bcrypt from 'bcrypt';
// import: the fixed words from the generated client.
import { Role, UserStatus } from '../generated/prisma/client';
// import: the type of the database connection. it is only a type here, so no real connection is made.
import { PrismaService } from '../prisma/prisma.service';
// import: the type of the users service. it is only a type here.
import { UsersService } from '../users/users.service';
// import: the service under test and its fixed messages.
import {
  AuthService,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_SESSION_MESSAGE,
} from './auth.service';
// import: the type of the token service. it is only a type here.
import { TokenService } from './token.service';

// a fake password that is used only in these tests.
const PASSWORD = 'Student@12345';

// a group of tests for the auth service.
describe('AuthService', () => {
  // the service under test and the fakes. they are rebuilt before every test, so no test sees leftovers of another.
  let service: AuthService;
  let refreshToken: { findUnique: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
  let prisma: { refreshToken: typeof refreshToken; $transaction: jest.Mock };
  let users: {
    findForLogin: jest.Mock;
    findOwnById: jest.Mock;
    findAuthStateById: jest.Mock;
    createStudent: jest.Mock;
  };
  let tokens: {
    signAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    hashRefreshToken: jest.Mock;
    refreshTokenExpiresAt: jest.Mock;
  };

  // a real bcrypt hash of the fake password. it is made with a low cost (4) so the tests stay fast.
  // the service can still check it, because the cost is stored inside the hash.
  let passwordHash: string;
  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  // beforeEach runs before every single test.
  beforeEach(() => {
    // fake database functions. by default an update changes one row and a create works.
    refreshToken = {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    // a fake transaction: it runs the given function at once with a client that has the same fake functions.
    prisma = {
      refreshToken,
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({ refreshToken }),
      ),
    };
    users = {
      findForLogin: jest.fn(),
      findOwnById: jest.fn(),
      findAuthStateById: jest.fn(),
      createStudent: jest.fn(),
    };
    // fake token tools with easy-to-read values. the "hash" of a raw token is "h:" plus the token.
    tokens = {
      signAccessToken: jest.fn().mockResolvedValue('access.jwt'),
      generateRefreshToken: jest.fn().mockReturnValue('raw-new'),
      hashRefreshToken: jest.fn((raw: string) => `h:${raw}`),
      refreshTokenExpiresAt: jest.fn().mockReturnValue(new Date('2030-01-01T00:00:00Z')),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
      tokens as unknown as TokenService,
    );
  });

  // a helper that gives a live student account for the login tests.
  const liveUser = (overrides: Partial<{ status: UserStatus }> = {}) => ({
    id: 1,
    passwordHash,
    role: Role.student,
    status: UserStatus.active,
    ...overrides,
  });

  // tests for register.
  describe('register', () => {
    // the password must be hashed, and the reply must be the safe user.
    it('hashes the password and returns the safe user', async () => {
      const safe = { id: 1, name: 'Ana', role: Role.student };
      users.createStudent.mockResolvedValue(safe);

      const result = await service.register({
        name: 'Ana',
        email: 'ana@studycircle.test',
        password: PASSWORD,
      });

      const input = users.createStudent.mock.calls[0][0];
      // safety: the saved value must be a bcrypt hash and never the real password.
      expect(input.passwordHash).not.toEqual(PASSWORD);
      expect(input.passwordHash.startsWith('$2')).toBe(true);
      // the hash must really belong to the password.
      await expect(bcrypt.compare(PASSWORD, input.passwordHash)).resolves.toBe(true);
      expect(result).toEqual(safe);
    });

    // a second account with the same email gives an exact 409 reply.
    it('gives a 409 error for a duplicate email', async () => {
      // pretend the database refused with the unique-rule error code.
      users.createStudent.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.register({ name: 'Ana', email: 'ana@studycircle.test', password: PASSWORD }),
      ).rejects.toThrow(ConflictException);
    });

    // any other database error must not be hidden or changed into a 409.
    it('passes on errors that are not a duplicate email', async () => {
      const failure = new Error('database is down');
      users.createStudent.mockRejectedValue(failure);

      await expect(
        service.register({ name: 'Ana', email: 'ana@studycircle.test', password: PASSWORD }),
      ).rejects.toBe(failure);
    });

    // safety: the service must never pass a role to the users service.
    it('never passes a role to the users service', async () => {
      users.createStudent.mockResolvedValue({ id: 1 });

      await service.register({ name: 'Ana', email: 'ana@studycircle.test', password: PASSWORD });

      expect(Object.keys(users.createStudent.mock.calls[0][0])).not.toContain('role');
    });
  });

  // tests for login.
  describe('login', () => {
    // a correct login gives the own user data and both raw tokens, and saves only the hash.
    it('logs in and saves only the hash of the refresh token', async () => {
      users.findForLogin.mockResolvedValue(liveUser());
      const own = { id: 1, name: 'Ana', email: 'ana@studycircle.test', role: Role.student };
      users.findOwnById.mockResolvedValue(own);

      const result = await service.login({ email: 'ana@studycircle.test', password: PASSWORD });

      expect(result).toEqual({ user: own, accessToken: 'access.jwt', refreshToken: 'raw-new' });
      expect(tokens.signAccessToken).toHaveBeenCalledWith(1, Role.student);
      // the database row holds the hash.
      expect(refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          tokenHash: 'h:raw-new',
          expiresAt: new Date('2030-01-01T00:00:00Z'),
        },
      });
      // safety: the raw token must not appear anywhere in the saved data.
      expect(JSON.stringify(refreshToken.create.mock.calls)).not.toContain('"raw-new"');
    });

    // a wrong password gives the general 401 reply.
    it('refuses a wrong password with the general message', async () => {
      users.findForLogin.mockResolvedValue(liveUser());

      await expect(
        service.login({ email: 'ana@studycircle.test', password: 'wrong-password' }),
      ).rejects.toMatchObject({
        constructor: UnauthorizedException,
        message: INVALID_CREDENTIALS_MESSAGE,
      });
      // no token may be saved after a failed login.
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    // an unknown email gives the same reply, and a password check still runs.
    it('refuses an unknown email and still compares a hash', async () => {
      users.findForLogin.mockResolvedValue(null);
      // a spy watches the real bcrypt.compare and lets the real function run.
      const compareSpy = jest.spyOn(bcrypt as unknown as { compare: () => Promise<boolean> }, 'compare');

      await expect(
        service.login({ email: 'nobody@studycircle.test', password: PASSWORD }),
      ).rejects.toMatchObject({
        constructor: UnauthorizedException,
        message: INVALID_CREDENTIALS_MESSAGE,
      });

      // safety: the compare must have run, so an unknown email takes about as long as a wrong password.
      expect(compareSpy).toHaveBeenCalledTimes(1);
      compareSpy.mockRestore();
    });

    // a suspended person is refused even with the right password.
    it('refuses a suspended account with the general message', async () => {
      users.findForLogin.mockResolvedValue(liveUser({ status: UserStatus.suspended }));

      await expect(
        service.login({ email: 'ana@studycircle.test', password: PASSWORD }),
      ).rejects.toMatchObject({
        constructor: UnauthorizedException,
        message: INVALID_CREDENTIALS_MESSAGE,
      });
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    // safety: the reply must not show which of the failures happened.
    it('gives the same message for every kind of failure', async () => {
      const messages: string[] = [];

      // failure 1: wrong password.
      users.findForLogin.mockResolvedValue(liveUser());
      await service.login({ email: 'a@studycircle.test', password: 'wrong-password' }).catch((e: Error) => messages.push(e.message));
      // failure 2: unknown email (a deleted account is also "not found", because the users service hides it).
      users.findForLogin.mockResolvedValue(null);
      await service.login({ email: 'b@studycircle.test', password: PASSWORD }).catch((e: Error) => messages.push(e.message));
      // failure 3: suspended account.
      users.findForLogin.mockResolvedValue(liveUser({ status: UserStatus.suspended }));
      await service.login({ email: 'c@studycircle.test', password: PASSWORD }).catch((e: Error) => messages.push(e.message));

      expect(messages).toHaveLength(3);
      expect(new Set(messages).size).toBe(1);
    });

    // an account that is deleted between the check and the read is treated like any failed login.
    it('refuses when the account disappears before its data is read', async () => {
      users.findForLogin.mockResolvedValue(liveUser());
      users.findOwnById.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ana@studycircle.test', password: PASSWORD }),
      ).rejects.toMatchObject({
        constructor: UnauthorizedException,
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    });
  });

  // tests for refresh.
  describe('refresh', () => {
    // a database row for a good, active refresh token.
    const activeRow = () => ({
      id: 10,
      userId: 1,
      tokenHash: 'h:raw-old',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    // no cookie means no session, and the database is not asked.
    it('refuses a missing token without asking the database', async () => {
      await expect(service.refresh(undefined)).rejects.toMatchObject({
        constructor: UnauthorizedException,
        message: INVALID_SESSION_MESSAGE,
      });
      expect(refreshToken.findUnique).not.toHaveBeenCalled();
    });

    // a token that is not in the database is refused.
    it('refuses an unknown token', async () => {
      refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('raw-old')).rejects.toThrow(UnauthorizedException);
      // the search used the hash, not the raw token.
      expect(refreshToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'h:raw-old' } });
    });

    // a good token is swapped for new tokens, and the old one is cancelled.
    it('rotates the token: cancels the old one and saves a new one', async () => {
      refreshToken.findUnique.mockResolvedValue(activeRow());
      users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.student, status: UserStatus.active });

      const result = await service.refresh('raw-old');

      expect(result).toEqual({ accessToken: 'access.jwt', refreshToken: 'raw-new' });
      // the old token is cancelled only if it is still active.
      expect(refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 10, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // the new token is saved as a hash.
      expect(refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          tokenHash: 'h:raw-new',
          expiresAt: new Date('2030-01-01T00:00:00Z'),
        },
      });
      // safety: the raw token must not appear anywhere in the saved data.
      expect(JSON.stringify(refreshToken.create.mock.calls)).not.toContain('"raw-new"');
    });

    // safety: a cancelled token that comes back cancels every token of that person.
    it('cancels all tokens of the person when a cancelled token is used again', async () => {
      refreshToken.findUnique.mockResolvedValue({ ...activeRow(), revokedAt: new Date() });

      await expect(service.refresh('raw-old')).rejects.toMatchObject({
        constructor: UnauthorizedException,
        message: INVALID_SESSION_MESSAGE,
      });

      // the cancel-all query uses the person's id.
      expect(refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // no rotation happened and no new token was made.
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    // an expired token is refused and nothing is rotated.
    it('refuses an expired token', async () => {
      refreshToken.findUnique.mockResolvedValue({ ...activeRow(), expiresAt: new Date(Date.now() - 1000) });

      await expect(service.refresh('raw-old')).rejects.toThrow(UnauthorizedException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // a suspended person cannot refresh, so the suspension works at once.
    it('refuses a refresh for a suspended account', async () => {
      refreshToken.findUnique.mockResolvedValue(activeRow());
      users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.student, status: UserStatus.suspended });

      await expect(service.refresh('raw-old')).rejects.toThrow(UnauthorizedException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // safety: when two requests use the same token at once, only one wins. the loser cancels all tokens.
    it('cancels all tokens outside the transaction when the race is lost', async () => {
      refreshToken.findUnique.mockResolvedValue(activeRow());
      users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.student, status: UserStatus.active });
      // the first update (inside the transaction) changes no row, because the other request got there first.
      refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.refresh('raw-old')).rejects.toThrow(UnauthorizedException);

      // no new token was saved.
      expect(refreshToken.create).not.toHaveBeenCalled();
      // the second update is the cancel-all query.
      expect(refreshToken.updateMany.mock.calls[1][0]).toEqual({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // safety: the cancel-all query ran after the transaction ended, so a rollback could not undo it.
      expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
        refreshToken.updateMany.mock.invocationCallOrder[1],
      );
    });
  });

  // tests for logout.
  describe('logout', () => {
    // the token of this browser is cancelled, by its hash.
    it('cancels the active token by its hash', async () => {
      await service.logout('raw-old');

      expect(refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'h:raw-old', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    // without a cookie logout still works and asks nothing.
    it('works without a cookie', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(refreshToken.updateMany).not.toHaveBeenCalled();
    });

    // a token that is not in the database changes nothing and does not fail.
    it('works with an unknown token', async () => {
      refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('raw-unknown')).resolves.toBeUndefined();
    });
  });
});