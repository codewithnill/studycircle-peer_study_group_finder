// imports the type of a built nestjs app, so the variable below has a clear type.
import type { INestApplication } from '@nestjs/common';
// imports supertest. it sends http requests to the app in memory and checks the replies.
import request from 'supertest';
// imports the server type that supertest expects.
import type { App } from 'supertest/types';
// imports the type of the prisma client. the test uses it to create subjects and levels directly.
import { PrismaClient } from '../src/generated/prisma/client';
// imports the helpers that build the test database client and empty every table.
import { cleanDatabase, createTestPrisma } from './support/clean-database';
// imports the helper that builds the test app with the same setup as the real server.
import { createTestApp } from './support/create-test-app';
// imports the helper that registers and logs in a test account through the real routes.
import { registerAndLogin } from './support/login-helper';

// the exact "not logged in" message the frontend relies on.
// it is written out here on purpose, so a changed message makes this test fail and forces a decision.
const UNAUTHENTICATED_MESSAGE = 'Please log in to continue';

// the test account.
// safety: this is a made-up password for the empty test database only.
const STUDENT = { name: 'Lookup Student', email: 'lookup@example.com', password: 'correct-horse-9' };

// these tests check the two list routes from the outside, the same way the frontend will call them.
// describe, it, expect, beforeAll, afterAll, beforeEach and afterEach are jest tools. they are available without an import.
describe('lookup routes (e2e)', () => {
  // the test database client. it creates the subjects and levels each test needs.
  let prisma: PrismaClient;
  // a fresh app for every test.
  let app: INestApplication<App>;

  // runs once before all tests. builds the test database client. the guard runs inside the helper.
  beforeAll(() => {
    prisma = createTestPrisma();
  });

  // runs once after all tests. closes the connection, so jest can exit cleanly.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // runs before each test: empty every table (subjects and levels too), then build a fresh app.
  beforeEach(async () => {
    await cleanDatabase(prisma);
    app = await createTestApp();
  });

  // runs after each test. closes the app and its own database connection.
  afterEach(async () => {
    await app.close();
  });

  // safety: both lists need a login, because the global guard locks every route without @Public().
  it('gives 401 on both routes without a cookie', async () => {
    for (const path of ['/api/v1/subjects', '/api/v1/levels']) {
      const res = await request(app.getHttpServer()).get(path).expect(401);
      expect(res.body).toEqual({ status_code: 401, message: UNAUTHENTICATED_MESSAGE, errors: [] });
    }
  });

  // the subject list holds only active subjects, sorted a to z, with exactly the four snake_case keys.
  it('gives the active subjects sorted by name, with safe fields only', async () => {
    // the rows are created out of order on purpose, so the test proves the sorting.
    const physics = await prisma.subject.create({
      data: { name: 'Physics', category: 'Science', courseCode: 'PHY101' },
    });
    const algebra = await prisma.subject.create({ data: { name: 'Algebra' } });
    // a hidden subject. it must never show up.
    await prisma.subject.create({ data: { name: 'Hidden Subject', isActive: false } });

    const { cookie } = await registerAndLogin(app, STUDENT);
    const res = await request(app.getHttpServer())
      .get('/api/v1/subjects')
      .set('Cookie', cookie)
      .expect(200);

    // the whole body is checked, so an extra key or a hidden row makes the test fail.
    expect(res.body).toEqual({
      data: [
        { id: algebra.id, name: 'Algebra', category: null, course_code: null },
        { id: physics.id, name: 'Physics', category: 'Science', course_code: 'PHY101' },
      ],
    });
  });

  // the level list holds only active levels, in sort_order, with exactly the three keys.
  it('gives the active levels in sort order, with safe fields only', async () => {
    // created out of order on purpose. the hidden level sits between the other two in sort_order.
    const advanced = await prisma.level.create({
      data: { name: 'Advanced', description: 'Ready for hard problems', sortOrder: 3 },
    });
    await prisma.level.create({
      data: { name: 'Hidden Level', description: 'Not offered', sortOrder: 2, isActive: false },
    });
    const beginner = await prisma.level.create({
      data: { name: 'Beginner', description: 'New to the subject', sortOrder: 1 },
    });

    const { cookie } = await registerAndLogin(app, STUDENT);
    const res = await request(app.getHttpServer())
      .get('/api/v1/levels')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body).toEqual({
      data: [
        { id: beginner.id, name: 'Beginner', description: 'New to the subject' },
        { id: advanced.id, name: 'Advanced', description: 'Ready for hard problems' },
      ],
    });
  });

  // the empty state: with no rows, both routes give 200 and an empty list, never an error.
  // the frontend can then show a "no subjects yet" message.
  it('gives an empty list when nothing is active', async () => {
    const { cookie } = await registerAndLogin(app, STUDENT);

    for (const path of ['/api/v1/subjects', '/api/v1/levels']) {
      const res = await request(app.getHttpServer()).get(path).set('Cookie', cookie).expect(200);
      expect(res.body).toEqual({ data: [] });
    }
  });
});