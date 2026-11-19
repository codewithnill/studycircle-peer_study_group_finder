// imports the type of a built nestjs app, so the variable below has a clear type.
import type { INestApplication } from '@nestjs/common';
// imports supertest. it sends http requests to the app in memory and checks the replies.
import request from 'supertest';
// imports the server type that supertest expects.
import type { App } from 'supertest/types';
// imports the type of the prisma client and the fixed words for the account state.
// safety: the fixed word "suspended" comes from the generated client and is never typed by hand.
import { PrismaClient, UserStatus } from '../src/generated/prisma/client';
// imports the helpers that build the test database client and empty every table.
import { cleanDatabase, createTestPrisma } from './support/clean-database';
// imports the helper that builds the test app with the same setup as the real server (tracker item 51).
import { createTestApp } from './support/create-test-app';

// the exact messages and cookie names that the frontend relies on.
// they are written out here on purpose, instead of being imported from the code.
// an e2e test checks the contract with the outside world, so a changed message must make this test fail.
const INVALID_CREDENTIALS_MESSAGE = 'email or password is not correct';
const UNAUTHENTICATED_MESSAGE = 'please log in to continue';
const INVALID_SESSION_MESSAGE = 'the session is not valid. please log in again';
// the plain sentence for a rate limit error (tracker item 53). it replaced "ThrottlerException: Too Many Requests".
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests. Please try again later';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// the test account. the password meets the minimum length of 8.
// safety: this is a made-up password for the empty test database only.
const STUDENT = {
  name: 'Test Student',
  email: 'student@example.com',
  password: 'correct-horse-9',
};

// the smallest part of a supertest reply that the cookie helpers need.
// the headers are read as unknown values, so each helper checks the type before using them.
interface ReplyWithHeaders {
  headers: Record<string, unknown>;
}

// finds the "set-cookie" line for one cookie name in a reply. gives undefined when the reply did not set that cookie.
// safety: this helper never prints anything, because the line holds a real token.
function findCookieLine(res: ReplyWithHeaders, name: string): string | undefined {
  // the header can be missing, one text, or a list of texts. all three cases become a list.
  const header = res.headers['set-cookie'];
  const lines = Array.isArray(header)
    ? header.filter((line): line is string => typeof line === 'string')
    : typeof header === 'string'
      ? [header]
      : [];
  // each line starts with "name=value", so the right line is the one that starts with the name.
  return lines.find((line) => line.startsWith(`${name}=`));
}

// reads the value part of a "set-cookie" line, for example "abc" from "access_token=abc; Path=/; HttpOnly".
function cookieValue(line: string, name: string): string {
  // the part before the first ";" is "name=value". the name and the "=" are cut off.
  return line.split(';')[0].slice(name.length + 1);
}

// checks whether a "set-cookie" line has one setting, for example "HttpOnly" or "Path=/".
// a true or false answer is used, so a failed check never prints the line and its token.
function hasCookieSetting(line: string, setting: string): boolean {
  // the settings come after the first ";". each one is trimmed and compared without caring about capital letters.
  return line
    .split(';')
    .slice(1)
    .some((part) => part.trim().toLowerCase() === setting.toLowerCase());
}

// these tests check the six auth routes from the outside, the same way the frontend will call them.
// every test starts with empty tables and a fresh app, so the rate limit counts also start at 0 (choice 1 for step 4).
// describe, it, expect, beforeAll, afterAll, beforeEach and afterEach are jest tools. they are available without an import.
describe('auth routes (e2e)', () => {
  // the test database client. it is used to set up states (like a suspended account) and to read rows back.
  let prisma: PrismaClient;
  // a fresh app for every test.
  let app: INestApplication<App>;

  // creates a student account through the real register route. gives the reply's "data" part.
  async function registerStudent(extra: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...STUDENT, ...extra })
      .expect(201);
    return res.body.data;
  }

  // logs the test student in through the real login route. gives the two cookies, ready to send back.
  // safety: the cookie values are kept in memory only and are never printed.
  async function loginStudent() {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: STUDENT.email, password: STUDENT.password })
      .expect(200);

    // both cookies must be set. a missing cookie stops the test with a clear name and no token.
    const accessLine = findCookieLine(res, ACCESS_COOKIE);
    const refreshLine = findCookieLine(res, REFRESH_COOKIE);
    if (!accessLine || !refreshLine) {
      throw new Error('login did not set both cookies.');
    }

    return {
      res,
      accessLine,
      refreshLine,
      accessValue: cookieValue(accessLine, ACCESS_COOKIE),
      refreshValue: cookieValue(refreshLine, REFRESH_COOKIE),
    };
  }

  // counts the refresh tokens of one person that are not cancelled yet.
  async function countActiveRefreshTokens(userId: number): Promise<number> {
    return prisma.refreshToken.count({ where: { userId, revokedAt: null } });
  }

  // runs once before all tests. builds the test database client. the guard runs inside the helper.
  beforeAll(() => {
    prisma = createTestPrisma();
  });

  // runs once after all tests. closes the test client's connection, so jest can exit cleanly.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // runs before each test: empty every table, then build a fresh app.
  // the fresh app has a fresh rate limit memory, so earlier tests never cause a 429 by accident.
  beforeEach(async () => {
    await cleanDatabase(prisma);
    app = await createTestApp();
  });

  // runs after each test. closes the app and its own database connection.
  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    // a new account gives 201 and only the safe fields.
    it('gives 201 with safe fields only', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(STUDENT)
        .expect(201);

      // the reply is wrapped in "data", and its keys are snake_case.
      const data = res.body.data;
      expect(Object.keys(data).sort()).toEqual([
        'academic_year',
        'bio',
        'department',
        'id',
        'name',
        'role',
      ]);
      // safety: the email and the password hash must never be in the register reply.
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('password_hash');
      expect(data).not.toHaveProperty('passwordHash');
      // a new account is always a student.
      expect(data.role).toBe('student');
      expect(data.name).toBe(STUDENT.name);
    });

    // a second account with the same email gives 409.
    it('gives 409 for an email that is already registered', async () => {
      await registerStudent();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(STUDENT)
        .expect(409);

      expect(res.body).toEqual({
        status_code: 409,
        message: 'this email is already registered',
        errors: [],
      });
    });

    // safety: a person must never be able to choose the admin role. an extra "role" field is refused.
    it('gives 400 for an extra role field', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...STUDENT, role: 'admin' })
        .expect(400);

      expect(res.body.status_code).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'role', message: 'property role should not exist' },
        ]),
      );
      // the refused request must not have created an account.
      expect(await prisma.user.count()).toBe(0);
    });

    // a password shorter than 8 characters gives 400, and the errors list names the field.
    it('gives 400 for a short password and names the field', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...STUDENT, password: 'short' })
        .expect(400);

      expect(res.body.status_code).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'password' })]),
      );
    });

    // proves both directions of the key change: academic_year goes in, reaches the code as academicYear, and comes back as academic_year.
    // without the snake-to-camel pipe, the validation pipe would refuse academic_year as an unknown field and give 400.
    it('turns snake_case input into camelCase for the code', async () => {
      const data = await registerStudent({ academic_year: 3, department: 'CSE' });

      // the reply shows the value with the snake_case key.
      expect(data.academic_year).toBe(3);
      expect(data.department).toBe('CSE');

      // the database row shows that the code received academicYear (the camelCase name).
      const row = await prisma.user.findUniqueOrThrow({ where: { id: data.id } });
      expect(row.academicYear).toBe(3);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    // a correct login gives 200, two httponly cookies, and no token in the json body.
    it('gives 200 and sets two httponly cookies, with no token in the body', async () => {
      await registerStudent();
      const { res, accessLine, refreshLine, accessValue, refreshValue } = await loginStudent();

      // both cookies must be httponly, so page javascript cannot read them.
      expect(hasCookieSetting(accessLine, 'HttpOnly')).toBe(true);
      expect(hasCookieSetting(refreshLine, 'HttpOnly')).toBe(true);
      // the access cookie goes to every route, and the refresh cookie only to the auth routes.
      expect(hasCookieSetting(accessLine, 'Path=/')).toBe(true);
      expect(hasCookieSetting(refreshLine, 'Path=/api/v1/auth')).toBe(true);
      // both cookies must have a real value.
      expect(accessValue.length > 0).toBe(true);
      expect(refreshValue.length > 0).toBe(true);

      // safety: the tokens must never be in the json body. true/false checks are used, so a failure never prints a token.
      const bodyText = JSON.stringify(res.body);
      expect(bodyText.includes(accessValue)).toBe(false);
      expect(bodyText.includes(refreshValue)).toBe(false);
      expect(res.body.data).not.toHaveProperty('access_token');
      expect(res.body.data).not.toHaveProperty('refresh_token');
      expect(res.body.data).not.toHaveProperty('password_hash');

      // the reply is the person's own data, so it may hold their own email.
      expect(res.body.data.email).toBe(STUDENT.email);
    });

    // safety: a wrong password and an unknown email give the same 401 reply, so nobody can learn which emails have an account.
    it('gives the same 401 for a wrong password and an unknown email', async () => {
      await registerStudent();

      const wrongPassword = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: STUDENT.email, password: 'wrong-password-1' })
        .expect(401);

      const unknownEmail = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: STUDENT.password })
        .expect(401);

      const expected = { status_code: 401, message: INVALID_CREDENTIALS_MESSAGE, errors: [] };
      expect(wrongPassword.body).toEqual(expected);
      expect(unknownEmail.body).toEqual(expected);
      // a failed login must set no cookies.
      expect(findCookieLine(wrongPassword, ACCESS_COOKIE)).toBeUndefined();
      expect(findCookieLine(unknownEmail, ACCESS_COOKIE)).toBeUndefined();
    });

    // proves the login rate limit: 5 calls per minute per address, so the 6th call gives 429.
    // it also proves the 429 reply uses the plain sentence and keeps the Retry-After header (tracker item 53).
    it('gives 429 with the plain sentence on the 6th wrong login in one minute', async () => {
      // the first 5 wrong logins are refused normally with 401.
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'nobody@example.com', password: 'wrong-password-1' })
          .expect(401);
      }

      // the 6th call is stopped by the rate limit before the password is even checked.
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password-1' })
        .expect(429);

      // the error has the three-key shape and the plain sentence, never the class name "ThrottlerException".
      expect(res.body).toEqual({
        status_code: 429,
        message: TOO_MANY_REQUESTS_MESSAGE,
        errors: [],
      });
      // the reply still tells the client how many seconds to wait.
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    // with a valid access cookie, the route gives the person's own data.
    it('gives 200 with the access cookie', async () => {
      await registerStudent();
      const { accessValue } = await loginStudent();

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `${ACCESS_COOKIE}=${accessValue}`)
        .expect(200);

      expect(res.body.data.email).toBe(STUDENT.email);
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    // without a cookie, the global login guard refuses the request.
    it('gives 401 without a cookie', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

      expect(res.body).toEqual({ status_code: 401, message: UNAUTHENTICATED_MESSAGE, errors: [] });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    // a valid refresh cookie gives 200 and two new cookies. the new refresh token is different (rotation).
    it('gives 200 and two new cookies', async () => {
      await registerStudent();
      const { refreshValue } = await loginStudent();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_COOKIE}=${refreshValue}`)
        .expect(200);

      const newAccessLine = findCookieLine(res, ACCESS_COOKIE);
      const newRefreshLine = findCookieLine(res, REFRESH_COOKIE);
      expect(newAccessLine).toBeDefined();
      expect(newRefreshLine).toBeDefined();

      // the new refresh token must not be the old one. a true/false check never prints either token.
      const newRefreshValue = cookieValue(newRefreshLine as string, REFRESH_COOKIE);
      expect(newRefreshValue.length > 0).toBe(true);
      expect(newRefreshValue === refreshValue).toBe(false);
    });

    // safety: an old refresh token that comes back may be stolen. the server refuses it and cancels every token of that person.
    it('refuses an old refresh token and cancels all tokens of that user', async () => {
      const user = await registerStudent();
      const { refreshValue: firstToken } = await loginStudent();

      // the first refresh works and gives a second token.
      const rotated = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_COOKIE}=${firstToken}`)
        .expect(200);
      const secondToken = cookieValue(
        findCookieLine(rotated, REFRESH_COOKIE) as string,
        REFRESH_COOKIE,
      );

      // the first token is used again. it is already cancelled, so this counts as reuse.
      const reused = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_COOKIE}=${firstToken}`)
        .expect(401);
      expect(reused.body).toEqual({ status_code: 401, message: INVALID_SESSION_MESSAGE, errors: [] });

      // the reuse cancelled every token of this person, so even the newer second token is now refused.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_COOKIE}=${secondToken}`)
        .expect(401);

      // the database confirms that no active refresh token is left for this person.
      expect(await countActiveRefreshTokens(user.id)).toBe(0);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    // logout cancels the refresh token and tells the browser to delete both cookies.
    // note: the old access token itself stays valid until it expires (up to 15 minutes). this is a known limit of short jwts.
    // so this test checks what a real browser does: the cookies are deleted, and /auth/me without a cookie gives 401.
    it('gives 200, cancels the refresh token, and clears both cookies', async () => {
      const user = await registerStudent();
      const { accessValue, refreshValue } = await loginStudent();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `${ACCESS_COOKIE}=${accessValue}; ${REFRESH_COOKIE}=${refreshValue}`)
        .expect(200);

      // a cleared cookie comes back with an empty value and an end date in the past (1 January 1970).
      for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
        const line = findCookieLine(res, name);
        expect(line).toBeDefined();
        expect(cookieValue(line as string, name)).toBe('');
        expect((line as string).includes('Expires=Thu, 01 Jan 1970')).toBe(true);
      }

      // the refresh token is cancelled in the database.
      expect(await countActiveRefreshTokens(user.id)).toBe(0);

      // the cancelled refresh token cannot make new cookies any more.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_COOKIE}=${refreshValue}`)
        .expect(401);

      // the browser has deleted the cookies, so /auth/me is called without one and gives 401.
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('suspended account', () => {
    // safety: a suspension must work at once, even while the person still holds a valid access token.
    it('gives 401 on /auth/me for a suspended account', async () => {
      const user = await registerStudent();
      const { accessValue } = await loginStudent();

      // the test sets the status straight in the test database, the same way an admin action would later.
      await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.suspended } });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `${ACCESS_COOKIE}=${accessValue}`)
        .expect(401);

      expect(res.body).toEqual({ status_code: 401, message: UNAUTHENTICATED_MESSAGE, errors: [] });
    });

    // safety: a suspended person gets the same general login message, so the reply does not reveal the suspension.
    it('gives the general 401 on login for a suspended account', async () => {
      const user = await registerStudent();
      await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.suspended } });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: STUDENT.email, password: STUDENT.password })
        .expect(401);

      expect(res.body).toEqual({ status_code: 401, message: INVALID_CREDENTIALS_MESSAGE, errors: [] });
      expect(findCookieLine(res, ACCESS_COOKIE)).toBeUndefined();
    });
  });
});