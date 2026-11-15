// import: only the type of the express response. "import type" means nothing from express is loaded at run time.
import type { Response } from 'express';
// import: the cookie names, the token lifetimes, and the refresh cookie path from the constants file.
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';

// the access cookie is sent to every route, so its path is the root.
export const ACCESS_COOKIE_PATH = '/';

// the two raw tokens that go into cookies.
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// only the two response functions that this file uses. a small type makes the tests easy, because a fake needs just these two.
type CookieWriter = Pick<Response, 'cookie' | 'clearCookie'>;

// the settings that every auth cookie shares. the same settings must be used to set and to clear a cookie.
// a browser keeps a cookie when a clear request has a different path, so one function builds both.
function sharedOptions(secure: boolean, path: string) {
  return {
    // safety: httponly means page javascript cannot read the cookie, so a stolen script cannot steal the tokens.
    httpOnly: true,
    // lax means the browser sends the cookie only for same-site requests (and simple top-level links).
    // "localhost:3000" and "localhost:3001" are the same site, because the port is ignored.
    sameSite: 'lax' as const,
    // safety: secure means "send only over https". it is off in development, because plain http://localhost would drop the cookie.
    secure,
    // the path limits which addresses receive the cookie.
    path,
  };
}

// sets both login cookies.
export function setAuthCookies(res: CookieWriter, tokens: AuthTokens, secure: boolean): void {
  // the access cookie lives as long as the access token (15 minutes). "maxAge" counts in milliseconds.
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...sharedOptions(secure, ACCESS_COOKIE_PATH),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  // the refresh cookie lives for 7 days and is sent only to the auth routes.
  // safety: a smaller path means the long-lived token travels with fewer requests.
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...sharedOptions(secure, REFRESH_COOKIE_PATH),
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

// clears both login cookies. each one is cleared with the same settings (and path) that were used to set it.
export function clearAuthCookies(res: CookieWriter, secure: boolean): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, sharedOptions(secure, ACCESS_COOKIE_PATH));
  res.clearCookie(REFRESH_TOKEN_COOKIE, sharedOptions(secure, REFRESH_COOKIE_PATH));
}