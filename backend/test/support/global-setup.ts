// imports a tool from node that runs a terminal command from inside code.
// it is used here to run the prisma migrate command.
import { execSync } from 'node:child_process';
// imports a small tool from node that builds a file path in a safe way on every computer.
import { resolve } from 'node:path';
// imports the helper from change 3. it copies TEST_DATABASE_URL into DATABASE_URL.
import { pointDatabaseUrlToTestDatabase } from './test-env';
// imports the guard from change 4. it refuses any link that is not a local test database.
import { assertSafeTestDatabaseUrl, getDatabaseName } from './guard';

// this function runs once, before all e2e tests start.
// jest finds it through the "globalSetup" setting (added in change 7). jest needs it to be the default export.
// it builds the test database from the committed migration files, so the tables and the two partial indexes are real.
export default async function globalSetup(): Promise<void> {
  // step 1: switch the link to the test database.
  // running this twice does no harm, because the helper file also runs it when it is loaded.
  pointDatabaseUrlToTestDatabase();

  // step 2: read the link that is now active.
  const databaseUrl = process.env['DATABASE_URL'];

  // step 3: run the guard. it throws an error and stops everything if the link is not a local database whose name ends with _test.
  // safety: this check must stay before the migrate command below. nothing may touch a database before the guard says yes.
  assertSafeTestDatabaseUrl(databaseUrl);

  // step 4: tell the person which database is about to be used.
  // only the name is printed. the full link is never printed, because it holds the password.
  console.log(`test setup: preparing the database "${getDatabaseName(databaseUrl as string)}".`);

  // step 5: apply every committed migration to the test database.
  // "migrate deploy" only replays the saved migration files. it does not compare or change the schema, and it does not need the shadow database.
  // this is why the two hand-written partial indexes are built too. "db push" would skip them.
  try {
    execSync('npx prisma migrate deploy', {
      // runs the command inside the backend folder, where prisma.config.ts lives.
      // __dirname is backend/test/support, so two ".." steps go up to backend/.
      cwd: resolve(__dirname, '../..'),
      // passes the current settings to the command, including the test link in DATABASE_URL.
      env: { ...process.env },
      // shows the command output in the terminal.
      // the output names the database used, which proves the test link was picked and not the dev link.
      stdio: 'inherit',
    });
  } catch {
    // a new error is thrown on purpose, so the original error is dropped.
    // safety: the original error could carry the link and its password.
    throw new Error('test setup stopped: could not apply the migrations to the test database. read the output above.');
  }
}