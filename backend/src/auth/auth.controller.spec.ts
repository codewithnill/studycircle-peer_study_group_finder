// imports: the 401 error type that the tests use.
import { UnauthorizedException } from '@nestjs/common';
// import: the type of the config reader. it is only a type here.
import { ConfigService } from '@nestjs/config';
// import: the fixed role words from the generated client.
import { Role } from '../generated/prisma/client';
// import: the type of the users service. it is only a type here.
import { UsersService } from '../users/users.service';
// import: the controller under test.
import { AuthController } from './auth.controller';
// import: the type of the auth service and its fixed messages, so the fake errors use the real texts.
import { AuthService, INVALID_CREDENTIALS_MESSAGE, INVALID_SESSION_MESSAGE } from './auth.service';

// a group of tests for the auth controller.
describe('AuthController', () => {
  // fakes for the helpers. they are rebuilt before every test, so no test sees leftovers of another.
  let auth: { register: jest.Mock; login: jest.Mock; refresh: jest.Mock; logout: jest.Mock };
  let users: { findOwnById: jest.Mock };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  // builds a controller. the config fake answers with the given NODE_ENV value.
  const makeController = (nodeEnv = 'development') => {
    const config = { get: jest.fn().mockReturnValue(nodeEnv) } as unknown as ConfigService;
    return new AuthController(
      auth as unknown as AuthService,
      users as unknown as UsersService,
      config,
    );
  };

  // a fake request that carries a refresh cookie.
  const requestWithRefresh = () => ({ cookies: { refresh_token: 'raw-refresh' } });

  // beforeEach runs before every single test.
  beforeEach(() => {
    auth = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    users = { findOwnById: jest.fn() };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
  });

  // register gives the safe user and sets no cookies.
  it('register returns the safe user and sets no cookies', async () => {
    const safe = { id: 1, name: 'Ana', role: Role.student };
    auth.register.mockResolvedValue(safe);

    const result = await makeController().register({
      name: 'Ana',
      email: 'ana@studycircle.test',
      password: 'Student@12345',
    });

    expect(result).toEqual(safe);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  // login sets both cookies and returns only the user.
  it('login sets both cookies and keeps the tokens out of the reply', async () => {
    const own = { id: 1, name: 'Ana', email: 'ana@studycircle.test', role: Role.student };
    auth.login.mockResolvedValue({ user: own, accessToken: 'a.jwt', refreshToken: 'raw-refresh' });

    const result = await makeController().login(
      { email: 'ana@studycircle.test', password: 'Student@12345' },
      res as never,
    );

    // the reply is the user.
    expect(result).toEqual(own);
    // safety: neither token may appear in the reply.
    expect(JSON.stringify(result)).not.toContain('a.jwt');
    expect(JSON.stringify(result)).not.toContain('raw-refresh');
    // both tokens went into cookies.
    expect(res.cookie).toHaveBeenCalledWith('access_token', 'a.jwt', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'raw-refresh', expect.any(Object));
  });

  // a failed login must not set any cookie.
  it('login sets no cookie when the credentials are refused', async () => {
    auth.login.mockRejectedValue(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));

    await expect(
      makeController().login({ email: 'ana@studycircle.test', password: 'wrong-password' }, res as never),
    ).rejects.toThrow(UnauthorizedException);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  // refresh reads the refresh cookie and sets two new cookies.
  it('refresh reads the refresh cookie and sets new cookies', async () => {
    auth.refresh.mockResolvedValue({ accessToken: 'new.jwt', refreshToken: 'raw-new' });

    await makeController().refresh(requestWithRefresh(), res as never);

    expect(auth.refresh).toHaveBeenCalledWith('raw-refresh');
    expect(res.cookie).toHaveBeenCalledWith('access_token', 'new.jwt', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'raw-new', expect.any(Object));
  });

  // a refused refresh clears the cookies and passes the error on.
  it('refresh clears the cookies when the session is refused', async () => {
    auth.refresh.mockRejectedValue(new UnauthorizedException(INVALID_SESSION_MESSAGE));

    await expect(makeController().refresh(requestWithRefresh(), res as never)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    expect(res.cookie).not.toHaveBeenCalled();
  });

  // a real server problem must not log the person out.
  it('refresh keeps the cookies when the error is not a refused session', async () => {
    const failure = new Error('database is down');
    auth.refresh.mockRejectedValue(failure);

    await expect(makeController().refresh(requestWithRefresh(), res as never)).rejects.toBe(failure);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  // logout cancels the token of this browser and clears the cookies.
  it('logout cancels the refresh token and clears both cookies', async () => {
    await makeController().logout(requestWithRefresh(), res as never);

    expect(auth.logout).toHaveBeenCalledWith('raw-refresh');
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  // logout must work even when there is no cookie.
  it('logout still clears the cookies when there is no refresh cookie', async () => {
    await makeController().logout({ cookies: {} }, res as never);

    expect(auth.logout).toHaveBeenCalledWith(undefined);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  // me gives the person's own data, found by the id from the guard.
  it('me returns the own data of the logged-in person', async () => {
    const own = { id: 7, name: 'Ana', email: 'ana@studycircle.test', role: Role.student };
    users.findOwnById.mockResolvedValue(own);

    await expect(makeController().me({ userId: 7, role: Role.student })).resolves.toEqual(own);
    expect(users.findOwnById).toHaveBeenCalledWith(7);
  });

  // a deleted account gives 401.
  it('me gives 401 when the account no longer exists', async () => {
    users.findOwnById.mockResolvedValue(null);

    await expect(makeController().me({ userId: 7, role: Role.student })).rejects.toThrow(UnauthorizedException);
  });

  // safety: the secure flag must turn on in production.
  it('uses secure cookies in production only', async () => {
    auth.login.mockResolvedValue({ user: { id: 1 }, accessToken: 'a.jwt', refreshToken: 'raw-refresh' });

    await makeController('production').login({ email: 'a@studycircle.test', password: 'x' }, res as never);

    for (const call of res.cookie.mock.calls) {
      expect(call[2].secure).toBe(true);
    }
  });
});