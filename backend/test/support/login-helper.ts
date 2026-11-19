// imports the type of a built nestjs app, so the helper knows what it receives.
import type { INestApplication } from '@nestjs/common';
// imports supertest. it sends http requests to the app in memory.
import request from 'supertest';
// imports the server type that supertest expects.
import type { App } from 'supertest/types';

// the name of the login cookie. it is written out here on purpose, like in the auth e2e tests,
// because an e2e test checks the contract with the frontend.
const ACCESS_COOKIE = 'access_token';

// the details of a test account.
// safety: the passwords are made up, for the empty test database only.
export interface TestAccount {
  name: string;
  email: string;
  password: string;
}

// what the helper gives back: the new user id, and a "Cookie" header value ready to send.
// safety: the cookie holds a real token. it stays in memory and is never printed.
export interface LoggedInAccount {
  id: number;
  cookie: string;
}

// finds the "set-cookie" line of the access cookie in a reply. gives undefined when it is missing.
// the header can be missing, one text, or a list of texts, so all three cases are handled.
function findAccessCookieLine(header: unknown): string | undefined {
  const lines = Array.isArray(header)
    ? header.filter((line): line is string => typeof line === 'string')
    : typeof header === 'string'
      ? [header]
      : [];
  return lines.find((line) => line.startsWith(`${ACCESS_COOKIE}=`));
}

// creates an account through the real register route, then logs in through the real login route.
// "extra" adds optional register fields, for example { department: 'CSE' }.
export async function registerAndLogin(
  app: INestApplication<App>,
  account: TestAccount,
  extra: Record<string, unknown> = {},
): Promise<LoggedInAccount> {
  // 1. register. the reply holds the new id.
  const registered = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ ...account, ...extra })
    .expect(201);

  // 2. log in. the token comes back only as a cookie, never in the body.
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: account.email, password: account.password })
    .expect(200);

  // 3. read the access cookie. a missing cookie stops the test with a clear sentence and no token.
  const line = findAccessCookieLine(login.headers['set-cookie']);
  if (!line) {
    throw new Error('login did not set the access cookie.');
  }

  // the part before the first ";" is "access_token=value". only that part is sent back, like a browser does.
  return { id: registered.body.data.id as number, cookie: line.split(';')[0] };
}