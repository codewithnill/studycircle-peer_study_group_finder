// imports the prisma adapter for postgres. prisma 7 needs an adapter to talk to the database.
import { PrismaPg } from '@prisma/adapter-pg';
// imports the generated prisma client from the project folder. it is never imported from @prisma/client in this project.
import { PrismaClient } from '../../src/generated/prisma/client';
// imports the guard from change 4. it refuses any link that is not a local test database.
import { assertSafeTestDatabaseUrl, getDatabaseName } from './guard';

// the ending that every test database name must have. it matches the guard.
const TEST_DATABASE_SUFFIX = '_test';

// builds a prisma client for the tests.
// safety: the guard runs first, so a client can never be built for a link that is not a local test database.
export function createTestPrisma(): PrismaClient {
  // reads the link. test-env.ts has already put the test link here.
  const databaseUrl = process.env['DATABASE_URL'];

  // refuses a wrong link before anything connects.
  assertSafeTestDatabaseUrl(databaseUrl);

  // builds the adapter and the client. the link is passed straight in and never printed.
  const adapter = new PrismaPg({ connectionString: databaseUrl as string });
  return new PrismaClient({ adapter });
}

// asks the database for its own name and stops if the name does not end with _test.
// this is the second check. the guard looks at the link text, and this looks at the real database that answered.
export async function assertConnectedToTestDatabase(prisma: PrismaClient): Promise<string> {
  // current_database() is a postgres function that returns the name of the database this connection is using.
  const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  const databaseName = rows[0]?.db ?? '';

  // stops if the real database name is not a test name.
  // safety: this is the last stop before any data is deleted.
  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `test stopped: connected to "${databaseName}", which does not end with "${TEST_DATABASE_SUFFIX}".`,
    );
  }
  return databaseName;
}

// empties every table in one command and restarts the id counters at 1.
// one TRUNCATE over all tables avoids the delete-order problem, because the delete rules use Restrict.
// the _prisma_migrations table is skipped, so the migration history stays safe.
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // second check first: confirms the real database is a test database.
  await assertConnectedToTestDatabase(prisma);

  // reads the table names from the database itself, so a table added later is never forgotten.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  // nothing to clean if there are no tables.
  if (tables.length === 0) {
    return;
  }

  // builds one list like "users","groups". each name is wrapped in double quotes, and any double quote inside a name is doubled.
  // safety: the names come from the database catalog and not from a person. raw sql is used only because prisma has no command that clears many linked tables and resets their id counters.
  const tableList = tables.map((t) => `"${t.tablename.replace(/"/g, '""')}"`).join(', ');

  // RESTART IDENTITY puts the id counters back to 1. CASCADE lets linked tables be cleared together.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

// re-exported so a test file can print which database it used, without importing the guard too.
export { getDatabaseName };