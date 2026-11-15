// import: the cookie names, the lifetimes, and the refresh path, so the tests follow the real rules.
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';
// import: the functions under test.
import { ACCESS_COOKIE_PATH, clearAuthCookies, setAuthCookies } from './auth-cookies';

// a group of tests for the cookie helper.
describe('auth cookies', () => {
  // a fake response with only the two functions that the helper uses.
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  // beforeEach runs before every single test, so no test sees leftovers of another.
  beforeEach(() => {
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
  });

  // finds the options of one call by the cookie name.
  const optionsOf = (mock: jest.Mock, name: string) => mock.mock.calls.find((call) => call[0] === name)?.[2];

  // the access cookie must be httponly, sent everywhere, and live as long as the token.
  it('sets the access cookie for every path with the token lifetime', () => {
    setAuthCookies(res, { accessToken: 'a.jwt', refreshToken: 'raw-refresh' }, false);

    expect(res.cookie).toHaveBeenCalledWith('access_token', 'a.jwt', expect.any(Object));
    expect(optionsOf(res.cookie, ACCESS_TOKEN_COOKIE)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: ACCESS_COOKIE_PATH,
      maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    });
  });

  // safety: the refresh cookie must be httponly and limited to the auth path.
  it('sets the refresh cookie for the auth path only, for seven days', () => {
    setAuthCookies(res, { accessToken: 'a.jwt', refreshToken: 'raw-refresh' }, false);

    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'raw-refresh', expect.any(Object));
    expect(optionsOf(res.cookie, REFRESH_TOKEN_COOKIE)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  });

  // the secure flag is passed to both cookies.
  it('applies the secure flag to both cookies', () => {
    setAuthCookies(res, { accessToken: 'a.jwt', refreshToken: 'raw-refresh' }, true);

    expect(optionsOf(res.cookie, ACCESS_TOKEN_COOKIE).secure).toBe(true);
    expect(optionsOf(res.cookie, REFRESH_TOKEN_COOKIE).secure).toBe(true);
  });

  // safety: a cookie is cleared only when the clear request has the same path as when it was set.
  it('clears each cookie with the same settings it was set with', () => {
    setAuthCookies(res, { accessToken: 'a.jwt', refreshToken: 'raw-refresh' }, true);
    clearAuthCookies(res, true);

    // the clear options are the set options without maxAge.
    for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
      const { maxAge: _maxAge, ...setOptions } = optionsOf(res.cookie, name);
      expect(optionsOf(res.clearCookie, name)).toEqual(setOptions);
    }
  });
});