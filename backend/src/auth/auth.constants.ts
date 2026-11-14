// the name of the cookie that holds the short-lived login token (the access token).
export const ACCESS_TOKEN_COOKIE = 'access_token';

// the name of the cookie that holds the long-lived refresh token.
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// how long the access token lives, in seconds (15 minutes).
// it is short on purpose: a stolen access token stops working soon.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

// how long the refresh token lives, in days.
export const REFRESH_TOKEN_TTL_DAYS = 7;

// the same lifetime in milliseconds, because javascript dates and cookie settings count in milliseconds.
export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

// the refresh cookie is sent only to this address and below it, not to every route.
// this matches the global prefix "api/v1" from main.ts plus the "auth" controller.
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

// the one signing method that is allowed for the access token.
// naming it on every check stops a forged token that claims a different method (or "none").
export const JWT_ALGORITHM = 'HS256' as const;

// the shortest secret that the app accepts for signing tokens.
export const MIN_JWT_SECRET_LENGTH = 32;

// password length rules. the minimum protects weak passwords.
// the maximum is 72 because bcrypt reads only the first 72 bytes of a password.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;