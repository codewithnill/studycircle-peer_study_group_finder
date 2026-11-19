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
// imports the helper that builds the test app with the same setup as the real server.
import { createTestApp } from './support/create-test-app';
// imports the helper that registers and logs in a test account.
import { registerAndLogin, type TestAccount } from './support/login-helper';

// the exact messages that the frontend relies on. they are written out in full on purpose,
// so a changed message makes this test fail and forces a decision.
const UNAUTHENTICATED_MESSAGE = 'Please log in to continue';
const VALIDATION_MESSAGE = 'Validation failed';
const PROFILE_NOT_FOUND_MESSAGE = 'This profile does not exist';
const NOTHING_TO_UPDATE_MESSAGE = 'Send at least one field to change';
const SUBJECT_NOT_FOUND_MESSAGE = 'This subject does not exist';
const SUBJECT_ALREADY_ADDED_MESSAGE = 'This subject is already in your list';
const SUBJECT_NOT_IN_LIST_MESSAGE = 'This subject is not in your list';
const SUBJECT_LIMIT_MESSAGE = 'You can add up to 10 subjects';

// two test accounts, so a test can check that one person cannot touch the other's data.
// safety: these are made-up passwords for the empty test database only.
const ANA: TestAccount = { name: 'Ana Student', email: 'ana@example.com', password: 'correct-horse-9' };
const RAFI: TestAccount = { name: 'Rafi Student', email: 'rafi@example.com', password: 'correct-horse-9' };

// these tests check the five profile routes from the outside, the same way the frontend will call them.
// every test starts with empty tables and a fresh app, so the rate limit counts also start at 0.
// safety: database rows are always read with a small "select" and checked field by field,
// so a failed test never prints a password hash.
describe('users routes (e2e)', () => {
  // the test database client. it sets up states (a suspended account, a hidden subject) and reads rows back.
  let prisma: PrismaClient;
  // a fresh app for every test.
  let app: INestApplication<App>;

  // a short name for the in-memory server that supertest talks to.
  const server = () => app.getHttpServer();

  // creates one subject straight in the test database. the tables are empty, so each test makes its own.
  async function createSubject(name: string, isActive = true) {
    return prisma.subject.create({ data: { name, isActive }, select: { id: true, name: true } });
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
  beforeEach(async () => {
    await cleanDatabase(prisma);
    app = await createTestApp();
  });

  // runs after each test. closes the app and its own database connection.
  afterEach(async () => {
    await app.close();
  });

  describe('login is required', () => {
    // safety: every profile route is locked by the global login guard. the guard runs before the pipes, so the reply is 401, not 400.
    it('gives 401 without a cookie on every profile route', async () => {
      const replies = [
        await request(server()).get('/api/v1/users/me/profile'),
        await request(server()).patch('/api/v1/users/me').send({ name: 'Ana' }),
        await request(server()).post('/api/v1/users/me/subjects').send({ subject_id: 1 }),
        await request(server()).delete('/api/v1/users/me/subjects/1'),
        await request(server()).get('/api/v1/users/1/profile'),
      ];

      for (const res of replies) {
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ status_code: 401, message: UNAUTHENTICATED_MESSAGE, errors: [] });
      }
    });
  });

  describe('GET /api/v1/users/me/profile', () => {
    // the own profile holds the person's own email, and nothing secret.
    it('gives 200 with own data and own email', async () => {
      const ana = await registerAndLogin(app, ANA, { department: 'CSE', academic_year: 2 });

      const res = await request(server())
        .get('/api/v1/users/me/profile')
        .set('Cookie', ana.cookie)
        .expect(200);

      // the keys are exactly these. no password_hash and no status.
      expect(Object.keys(res.body.data).sort()).toEqual([
        'academic_year',
        'bio',
        'department',
        'email',
        'id',
        'name',
        'role',
        'subjects',
      ]);
      expect(res.body.data).toEqual({
        id: ana.id,
        name: ANA.name,
        email: ANA.email,
        department: 'CSE',
        academic_year: 2,
        bio: null,
        role: 'student',
        subjects: [],
      });
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    // a valid change gives 200, and the database row really changes.
    it('gives 200 and changes the database row', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ name: '  Ana Rahman ', department: 'EEE', bio: 'Likes graphs.' })
        .expect(200);

      // the reply is the new own profile. the name lost its outer spaces.
      expect(res.body.data).toMatchObject({ name: 'Ana Rahman', department: 'EEE', bio: 'Likes graphs.' });

      const row = await prisma.user.findUniqueOrThrow({
        where: { id: ana.id },
        select: { name: true, department: true, bio: true },
      });
      expect(row).toEqual({ name: 'Ana Rahman', department: 'EEE', bio: 'Likes graphs.' });
    });

    // proves the key change in both directions: academic_year goes in, reaches the code as academicYear, and comes back as academic_year.
    it('turns snake_case input into camelCase for the code', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ academic_year: 5 })
        .expect(200);

      expect(res.body.data.academic_year).toBe(5);
      const row = await prisma.user.findUniqueOrThrow({
        where: { id: ana.id },
        select: { academicYear: true },
      });
      expect(row.academicYear).toBe(5);
    });

    // null clears a field, and "" or only spaces count as empty too.
    it('clears department and bio with null and with empty text', async () => {
      const ana = await registerAndLogin(app, ANA, { department: 'CSE' });
      await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ bio: 'Hello' })
        .expect(200);

      await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ department: null, bio: '   ' })
        .expect(200);

      const row = await prisma.user.findUniqueOrThrow({
        where: { id: ana.id },
        select: { department: true, bio: true },
      });
      expect(row).toEqual({ department: null, bio: null });
    });

    // safety: a person must never be able to change a role, an email, or a status through this route.
    it('gives 400 for an extra role, email, or status field, and the row does not change', async () => {
      const ana = await registerAndLogin(app, ANA);
      const before = await prisma.user.findUniqueOrThrow({
        where: { id: ana.id },
        select: { name: true, email: true, role: true, status: true },
      });

      const cases = [
        { extra: { role: 'admin' }, error: { field: 'role', message: 'property role should not exist' } },
        { extra: { email: 'eve@example.com' }, error: { field: 'email', message: 'property email should not exist' } },
        { extra: { status: 'suspended' }, error: { field: 'status', message: 'property status should not exist' } },
      ];

      for (const { extra, error } of cases) {
        const res = await request(server())
          .patch('/api/v1/users/me')
          .set('Cookie', ana.cookie)
          .send({ name: 'Changed', ...extra })
          .expect(400);

        expect(res.body.message).toBe(VALIDATION_MESSAGE);
        expect(res.body.errors).toContainEqual(error);
      }

      // the whole request was refused, so even the valid "name" part did not change anything.
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: ana.id },
        select: { name: true, email: true, role: true, status: true },
      });
      expect(after).toEqual(before);
    });

    // bad values give 400, and the errors list names the field in snake_case. each field message starts with that name.
    it('gives 400 for a bad academic_year or a too long bio, and names the field', async () => {
      const ana = await registerAndLogin(app, ANA);

      const year = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ academic_year: 7 })
        .expect(400);
      expect(year.body.message).toBe(VALIDATION_MESSAGE);
      expect(year.body.errors).toContainEqual(
        expect.objectContaining({ field: 'academic_year', message: expect.stringMatching(/^academic_year /) }),
      );

      const bio = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ bio: 'b'.repeat(501) })
        .expect(400);
      expect(bio.body.errors).toContainEqual(expect.objectContaining({ field: 'bio' }));
    });

    // every account needs a name, so null must not clear it.
    it('gives 400 for a null name, and the name does not change', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({ name: null })
        .expect(400);

      expect(res.body.errors).toContainEqual(expect.objectContaining({ field: 'name' }));
      const row = await prisma.user.findUniqueOrThrow({ where: { id: ana.id }, select: { name: true } });
      expect(row.name).toBe(ANA.name);
    });

    // an empty body changes nothing, so it gets a clear 400.
    it('gives 400 with a plain sentence for an empty body', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', ana.cookie)
        .send({})
        .expect(400);

      expect(res.body).toEqual({ status_code: 400, message: NOTHING_TO_UPDATE_MESSAGE, errors: [] });
    });

    // safety: the route has no user id in the address, so a person can only change their own row.
    // an id in the body is refused too, because the dto does not list it.
    it('lets one person change only their own data', async () => {
      const ana = await registerAndLogin(app, ANA);
      const rafi = await registerAndLogin(app, RAFI);

      // rafi tries to point the change at ana's id. the extra field is refused.
      const sneaky = await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', rafi.cookie)
        .send({ id: ana.id, name: 'Hacked' })
        .expect(400);
      expect(sneaky.body.errors).toContainEqual({ field: 'id', message: 'property id should not exist' });

      // a normal change from rafi changes only rafi's row.
      await request(server())
        .patch('/api/v1/users/me')
        .set('Cookie', rafi.cookie)
        .send({ name: 'Rafi New' })
        .expect(200);

      const anaRow = await prisma.user.findUniqueOrThrow({ where: { id: ana.id }, select: { name: true } });
      const rafiRow = await prisma.user.findUniqueOrThrow({ where: { id: rafi.id }, select: { name: true } });
      expect(anaRow.name).toBe(ANA.name);
      expect(rafiRow.name).toBe('Rafi New');
    });
  });

  describe('GET /api/v1/users/:id/profile', () => {
    // safety: the public profile is what strangers see. it has no email, no password_hash, and no role.
    it('gives 200 with safe fields and active subjects only', async () => {
      const ana = await registerAndLogin(app, ANA, { department: 'CSE' });
      const rafi = await registerAndLogin(app, RAFI);
      const calculus = await createSubject('Calculus');
      const hidden = await createSubject('Old Subject', false);
      await prisma.userSubject.createMany({
        data: [
          { userId: ana.id, subjectId: calculus.id },
          { userId: ana.id, subjectId: hidden.id },
        ],
      });

      const res = await request(server())
        .get(`/api/v1/users/${ana.id}/profile`)
        .set('Cookie', rafi.cookie)
        .expect(200);

      expect(Object.keys(res.body.data).sort()).toEqual([
        'academic_year',
        'bio',
        'department',
        'id',
        'name',
        'subjects',
      ]);
      // the hidden subject is not shown.
      expect(res.body.data.subjects).toEqual([{ id: calculus.id, name: 'Calculus' }]);
      // a true/false check on the whole reply text, so nothing secret is printed if it fails.
      const text = JSON.stringify(res.body);
      expect(text.includes(ANA.email)).toBe(false);
      expect(text.includes('password_hash')).toBe(false);
    });

    // safety: a suspended account must not appear in any public view.
    it('gives 404 for a suspended account', async () => {
      const ana = await registerAndLogin(app, ANA);
      const rafi = await registerAndLogin(app, RAFI);
      await prisma.user.update({ where: { id: ana.id }, data: { status: UserStatus.suspended } });

      const res = await request(server())
        .get(`/api/v1/users/${ana.id}/profile`)
        .set('Cookie', rafi.cookie)
        .expect(404);

      expect(res.body).toEqual({ status_code: 404, message: PROFILE_NOT_FOUND_MESSAGE, errors: [] });
    });

    // safety: a deleted account (deleted_at filled in) must not appear in any public view.
    it('gives 404 for a deleted account', async () => {
      const ana = await registerAndLogin(app, ANA);
      const rafi = await registerAndLogin(app, RAFI);
      await prisma.user.update({ where: { id: ana.id }, data: { deletedAt: new Date() } });

      const res = await request(server())
        .get(`/api/v1/users/${ana.id}/profile`)
        .set('Cookie', rafi.cookie)
        .expect(404);

      expect(res.body).toEqual({ status_code: 404, message: PROFILE_NOT_FOUND_MESSAGE, errors: [] });
    });

    // an unknown id, a word, and a number too big for the column all give the same 404, never a 500.
    it('gives 404 for an unknown id, a word, and a huge number', async () => {
      const rafi = await registerAndLogin(app, RAFI);

      for (const id of ['999', 'abc', '99999999999']) {
        const res = await request(server())
          .get(`/api/v1/users/${id}/profile`)
          .set('Cookie', rafi.cookie)
          .expect(404);

        expect(res.body).toEqual({ status_code: 404, message: PROFILE_NOT_FOUND_MESSAGE, errors: [] });
      }
    });
  });

  describe('subjects of interest', () => {
    // adding a subject gives 201 with the subject, and the link row exists.
    it('adds a subject', async () => {
      const ana = await registerAndLogin(app, ANA);
      const calculus = await createSubject('Calculus');

      const res = await request(server())
        .post('/api/v1/users/me/subjects')
        .set('Cookie', ana.cookie)
        .send({ subject_id: calculus.id })
        .expect(201);

      expect(res.body.data).toEqual({ id: calculus.id, name: 'Calculus' });
      const link = await prisma.userSubject.findUnique({
        where: { userId_subjectId: { userId: ana.id, subjectId: calculus.id } },
      });
      expect(link).not.toBeNull();
    });

    // the same subject twice gives 409, and there is still only one row.
    it('gives 409 for the same subject added twice', async () => {
      const ana = await registerAndLogin(app, ANA);
      const calculus = await createSubject('Calculus');
      await request(server())
        .post('/api/v1/users/me/subjects')
        .set('Cookie', ana.cookie)
        .send({ subject_id: calculus.id })
        .expect(201);

      const res = await request(server())
        .post('/api/v1/users/me/subjects')
        .set('Cookie', ana.cookie)
        .send({ subject_id: calculus.id })
        .expect(409);

      expect(res.body).toEqual({ status_code: 409, message: SUBJECT_ALREADY_ADDED_MESSAGE, errors: [] });
      expect(await prisma.userSubject.count({ where: { userId: ana.id } })).toBe(1);
    });

    // an id with no subject behind it gives 404, not the database "still linked" message.
    it('gives 404 for an unknown subject', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await request(server())
        .post('/api/v1/users/me/subjects')
        .set('Cookie', ana.cookie)
        .send({ subject_id: 999 })
        .expect(404);

      expect(res.body).toEqual({ status_code: 404, message: SUBJECT_NOT_FOUND_MESSAGE, errors: [] });
    });

    // a subject hidden by the admin acts as if it does not exist.
    it('gives 404 for an inactive subject, and no row is made', async () => {
      const ana = await registerAndLogin(app, ANA);
      const hidden = await createSubject('Old Subject', false);

      const res = await request(server())
        .post('/api/v1/users/me/subjects')
        .set('Cookie', ana.cookie)
        .send({ subject_id: hidden.id })
        .expect(404);

      expect(res.body).toEqual({ status_code: 404, message: SUBJECT_NOT_FOUND_MESSAGE, errors: [] });
      expect(await prisma.userSubject.count({ where: { userId: ana.id } })).toBe(0);
    });

    // the list holds at most 10 subjects. the 11th gives 409, and the list stays at 10.
    it('gives 409 for the 11th subject', async () => {
      const ana = await registerAndLogin(app, ANA);
      const subjects = [];
      for (let i = 1; i <= 11; i++) {
        subjects.push(await createSubject(`Subject ${i}`));
      }

      // the first 10 work.
      for (const subject of subjects.slice(0, 10)) {
        await request(server())
          .post('/api/v1/users/me/subjects')
          .set('Cookie', ana.cookie)
          .send({ subject_id: subject.id })
          .expect(201);
      }

      // the 11th is refused.
      const res = await request(server())
        .post('/api/v1/users/me/subjects')
        .set('Cookie', ana.cookie)
        .send({ subject_id: subjects[10].id })
        .expect(409);

      expect(res.body).toEqual({ status_code: 409, message: SUBJECT_LIMIT_MESSAGE, errors: [] });
      expect(await prisma.userSubject.count({ where: { userId: ana.id } })).toBe(10);
    });

    // removing a subject gives 200 with { data: null }, and the link row is gone.
    it('removes a subject', async () => {
      const ana = await registerAndLogin(app, ANA);
      const calculus = await createSubject('Calculus');
      await prisma.userSubject.create({ data: { userId: ana.id, subjectId: calculus.id } });

      const res = await request(server())
        .delete(`/api/v1/users/me/subjects/${calculus.id}`)
        .set('Cookie', ana.cookie)
        .expect(200);

      expect(res.body).toEqual({ data: null });
      expect(await prisma.userSubject.count({ where: { userId: ana.id } })).toBe(0);
    });

    // removing a subject that is not in the list, or a word instead of an id, gives 404.
    it('gives 404 when the subject is not in the list', async () => {
      const ana = await registerAndLogin(app, ANA);
      const calculus = await createSubject('Calculus');

      for (const id of [String(calculus.id), 'abc']) {
        const res = await request(server())
          .delete(`/api/v1/users/me/subjects/${id}`)
          .set('Cookie', ana.cookie)
          .expect(404);

        expect(res.body).toEqual({ status_code: 404, message: SUBJECT_NOT_IN_LIST_MESSAGE, errors: [] });
      }
    });

    // a subject the admin hides later disappears from the person's own profile too.
    it('hides a subject from the own profile after the admin hides it', async () => {
      const ana = await registerAndLogin(app, ANA);
      const calculus = await createSubject('Calculus');
      await prisma.userSubject.create({ data: { userId: ana.id, subjectId: calculus.id } });
      await prisma.subject.update({ where: { id: calculus.id }, data: { isActive: false } });

      const res = await request(server())
        .get('/api/v1/users/me/profile')
        .set('Cookie', ana.cookie)
        .expect(200);

      expect(res.body.data.subjects).toEqual([]);
    });

    // safety: one person cannot remove a subject from another person's list.
    it("does not let one person remove another person's subject", async () => {
      const ana = await registerAndLogin(app, ANA);
      const rafi = await registerAndLogin(app, RAFI);
      const calculus = await createSubject('Calculus');
      await prisma.userSubject.create({ data: { userId: ana.id, subjectId: calculus.id } });

      // rafi asks to remove the subject. it is not in rafi's list, so the reply is 404.
      await request(server())
        .delete(`/api/v1/users/me/subjects/${calculus.id}`)
        .set('Cookie', rafi.cookie)
        .expect(404);

      // ana's link row is still there.
      expect(await prisma.userSubject.count({ where: { userId: ana.id } })).toBe(1);
    });
  });

  describe('shared profile rules at register', () => {
    // decision 4c: an empty department at register is saved as null, the same as in the profile edit.
    it('saves an empty department as null', async () => {
      const res = await request(server())
        .post('/api/v1/auth/register')
        .send({ ...ANA, department: '' })
        .expect(201);

      expect(res.body.data.department).toBeNull();
      const row = await prisma.user.findUniqueOrThrow({
        where: { id: res.body.data.id },
        select: { department: true },
      });
      expect(row.department).toBeNull();
    });
  });
});