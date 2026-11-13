// imports the type of the prisma client, so the variable below has a clear type.
import { PrismaClient } from '../src/generated/prisma/client';
// imports the helpers from change 6.
import { assertConnectedToTestDatabase, cleanDatabase, createTestPrisma } from './support/clean-database';

// this test file proves the test database itself is set up correctly.
// it does not test any app route. it tests the safety net underneath the routes.
// describe, it, expect, beforeAll and afterAll are jest tools. they are available without an import.
describe('test database setup', () => {
  // holds the client for all tests in this file.
  let prisma: PrismaClient;

  // runs once before the tests in this file. builds the client. the guard runs inside the helper.
  beforeAll(() => {
    prisma = createTestPrisma();
  });

  // runs once after the tests. closes the connection, so jest can exit cleanly.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // runs before each test. starts every test from empty tables.
  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  // proves the real database that answered has a test name, and is not the dev database.
  it('uses a database whose name ends with _test', async () => {
    const name = await assertConnectedToTestDatabase(prisma);
    expect(name.endsWith('_test')).toBe(true);
    expect(name).not.toBe('studycircle');
  });

  // proves both hand-written partial unique indexes were built by the migrations.
  // the whole project depends on these two rules, so a missing index must fail loudly.
  it('has both partial unique indexes', async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname LIKE '%one_%'
    `;
    const names = rows.map((r) => r.indexname).sort();
    expect(names).toEqual([
      'group_members_one_active_leader_per_group',
      'join_requests_one_pending_per_user_group',
    ]);
  });

  // proves the cleaner empties tables and restarts the id counter at 1.
  it('cleans tables and restarts ids', async () => {
    // creates one row, then cleans, then checks nothing is left.
    await prisma.level.create({ data: { name: 'Temp', description: 'temporary row for a test' } });
    await cleanDatabase(prisma);
    expect(await prisma.level.count()).toBe(0);

    // creates a row again. the first id after a clean must be 1.
    const level = await prisma.level.create({ data: { name: 'Temp', description: 'temporary row for a test' } });
    expect(level.id).toBe(1);
  });
});