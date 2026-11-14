// imports: the context type and the 401 error type.
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import: the real reflector. the tests use real decorators on a small demo class, so the decorators are tested too.
import { Reflector } from '@nestjs/core';
// import: the fixed words from the generated client.
import { Role, UserStatus } from '../../generated/prisma/client';
// import: the types of the helpers. they are only types here, so nothing real is created.
import { UsersService } from '../../users/users.service';
import { TokenService } from '../token.service';
// import: the cookie name and the decorator under test.
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';
import { Public } from '../decorators/public.decorator';
// import: the guard under test and its message.
import { JwtAuthGuard, UNAUTHENTICATED_MESSAGE } from './jwt-auth.guard';

// a tiny demo class with one public method and one locked method.
class DemoController {
  @Public()
  open(): void {}

  closed(): void {}
}

// the shape of a fake request in these tests.
interface FakeRequest {
  cookies?: Record<string, unknown>;
  user?: unknown;
}

// builds a fake context for one method of the demo class, with the given request inside.
const makeContext = (request: FakeRequest, handler: () => void): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => DemoController,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

// a group of tests for the login guard.
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokens: { verifyAccessToken: jest.Mock };
  let users: { findAuthStateById: jest.Mock };

  // beforeEach runs before every single test, so no test sees leftovers of another.
  beforeEach(() => {
    tokens = { verifyAccessToken: jest.fn() };
    users = { findAuthStateById: jest.fn() };
    guard = new JwtAuthGuard(
      new Reflector(),
      tokens as unknown as TokenService,
      users as unknown as UsersService,
    );
  });

  // a helper: a request that carries a login cookie.
  const withCookie = (): FakeRequest => ({ cookies: { [ACCESS_TOKEN_COOKIE]: 'some.jwt.token' } });

  // a public route needs no login, and nothing is checked.
  it('lets a public route in without any check', async () => {
    const request: FakeRequest = {};

    await expect(guard.canActivate(makeContext(request, DemoController.prototype.open))).resolves.toBe(true);
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
    expect(users.findAuthStateById).not.toHaveBeenCalled();
  });

  // a locked route without a cookie gives 401.
  it('refuses a request without the cookie', async () => {
    await expect(
      guard.canActivate(makeContext({ cookies: {} }, DemoController.prototype.closed)),
    ).rejects.toMatchObject({ constructor: UnauthorizedException, message: UNAUTHENTICATED_MESSAGE });
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
  });

  // the cookie reader may not have run, so "cookies" can be missing completely.
  it('refuses a request that has no cookies object', async () => {
    await expect(guard.canActivate(makeContext({}, DemoController.prototype.closed))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // an empty cookie value counts as no token.
  it('refuses an empty cookie value', async () => {
    const request: FakeRequest = { cookies: { [ACCESS_TOKEN_COOKIE]: '' } };

    await expect(guard.canActivate(makeContext(request, DemoController.prototype.closed))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
  });

  // a token that fails the check (forged, expired, or broken) gives 401, and the database is not asked.
  it('refuses a token that fails the check', async () => {
    tokens.verifyAccessToken.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext(withCookie(), DemoController.prototype.closed)),
    ).rejects.toThrow(UnauthorizedException);
    expect(users.findAuthStateById).not.toHaveBeenCalled();
  });

  // a good token for a live account lets the request in and puts the person on the request.
  it('lets a valid token for an active account in and sets the user', async () => {
    tokens.verifyAccessToken.mockResolvedValue({ userId: 1, role: Role.student });
    users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.student, status: UserStatus.active });
    const request = withCookie();

    await expect(guard.canActivate(makeContext(request, DemoController.prototype.closed))).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 1, role: Role.student });
    // the token value from the cookie is what was checked.
    expect(tokens.verifyAccessToken).toHaveBeenCalledWith('some.jwt.token');
  });

  // safety: a suspended person is refused even with a token that is still valid.
  it('refuses a suspended account even with a valid token', async () => {
    tokens.verifyAccessToken.mockResolvedValue({ userId: 1, role: Role.student });
    users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.student, status: UserStatus.suspended });
    const request = withCookie();

    await expect(guard.canActivate(makeContext(request, DemoController.prototype.closed))).rejects.toThrow(
      UnauthorizedException,
    );
    // no person may be put on the request after a refusal.
    expect(request.user).toBeUndefined();
  });

  // safety: a deleted account is hidden by the users service, so it comes back as null.
  it('refuses a deleted account even with a valid token', async () => {
    tokens.verifyAccessToken.mockResolvedValue({ userId: 1, role: Role.student });
    users.findAuthStateById.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext(withCookie(), DemoController.prototype.closed)),
    ).rejects.toThrow(UnauthorizedException);
  });

  // safety: the role on the request comes from the database and not from the token.
  it('takes the role from the database and not from the token', async () => {
    // the token says student, but the database says admin (the role was changed after the token was made).
    tokens.verifyAccessToken.mockResolvedValue({ userId: 1, role: Role.student });
    users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.admin, status: UserStatus.active });
    const request = withCookie();

    await guard.canActivate(makeContext(request, DemoController.prototype.closed));

    expect(request.user).toEqual({ userId: 1, role: Role.admin });
  });

  // safety: the reply must not show which of the failures happened.
  it('gives the same message for every kind of failure', async () => {
    const messages: string[] = [];
    const collect = (error: Error) => messages.push(error.message);

    // failure 1: no cookie.
    await guard.canActivate(makeContext({ cookies: {} }, DemoController.prototype.closed)).catch(collect);
    // failure 2: a bad token.
    tokens.verifyAccessToken.mockResolvedValue(null);
    await guard.canActivate(makeContext(withCookie(), DemoController.prototype.closed)).catch(collect);
    // failure 3: a suspended account.
    tokens.verifyAccessToken.mockResolvedValue({ userId: 1, role: Role.student });
    users.findAuthStateById.mockResolvedValue({ id: 1, role: Role.student, status: UserStatus.suspended });
    await guard.canActivate(makeContext(withCookie(), DemoController.prototype.closed)).catch(collect);
    // failure 4: a deleted account.
    users.findAuthStateById.mockResolvedValue(null);
    await guard.canActivate(makeContext(withCookie(), DemoController.prototype.closed)).catch(collect);

    expect(messages).toHaveLength(4);
    expect(new Set(messages).size).toBe(1);
  });
});