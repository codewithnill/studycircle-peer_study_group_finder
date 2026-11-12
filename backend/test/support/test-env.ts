// imports the dotenv tool. it reads the backend/.env file and copies each line into process.env.
// process.env is the place where node keeps environment variables (named settings).
// it is named loadEnvFile here, so the code below reads in plain words.
import { config as loadEnvFile } from 'dotenv';
// imports a small tool from node that builds a file path in a safe way on every computer.
// the "node:" start means this tool is built into node, not downloaded from npm.
import { resolve } from 'node:path';

// this function makes the whole test run use the test database.
// the app code reads DATABASE_URL. the tests keep their own link in TEST_DATABASE_URL.
// this function copies the test link into DATABASE_URL, inside the test process only.
// safety: this is what stops a test run from touching the dev database. the guard in the next file adds a second check.
export function pointDatabaseUrlToTestDatabase(): void {
  // loads backend/.env into process.env.
  // __dirname is the folder of this file (backend/test/support), so two ".." steps go up to backend/.
  // using this exact path works even when jest is started from another folder.
  // quiet: true stops dotenv from printing its own log line to the terminal.
  loadEnvFile({ path: resolve(__dirname, '../../.env'), quiet: true });

  // reads the test link that was just loaded. bracket style is used because the name comes from the environment, not from the code.
  const testDatabaseUrl = process.env['TEST_DATABASE_URL'];

  // stops with a clear message if the variable is missing or only has spaces.
  // a missing link must never fall back to the dev database by accident.
  // safety: the error text never prints any link, because a link contains the password.
  if (!testDatabaseUrl || testDatabaseUrl.trim() === '') {
    throw new Error(
      'test setup stopped: TEST_DATABASE_URL is missing. add it to backend/.env (see backend/.env.example).',
    );
  }

  // replaces DATABASE_URL with the test link, for this test process and the child processes it starts.
  // the app and prisma both read DATABASE_URL, so from now on they talk to the test database.
  process.env['DATABASE_URL'] = testDatabaseUrl;
}

// runs the function as soon as this file is loaded.
// jest loads this file through "setupFiles" (added in a later change), so the link is switched before any test code runs.
// the global setup file can also import the function above, and running it twice does no harm.
pointDatabaseUrlToTestDatabase();