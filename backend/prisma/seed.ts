// this is the entry file for the seed script. "npx prisma db seed" runs it.
// right now it only checks safety and wipes the database. the data parts are added later.

// loads backend/.env into process.env. this must stay the first import,
// so the variables exist before any other file reads them.
import 'dotenv/config';
// borrows the two safety checks from guards.ts.
import { assertSafeToSeed, getAdminPassword } from './seed/guards';
// borrows the function that builds the seed database connection.
import { createSeedClient } from './seed/client';
// borrows the function that clears every table.
import { resetDatabase } from './seed/reset';

// runs the whole seed from start to end.
async function main(): Promise<void> {
  // step 1: refuse production and non-local databases. an error here stops everything.
  assertSafeToSeed();

  // step 2: check the admin password now, before the wipe, so a bad setup never leaves
  // the database empty. the value is not used yet. the user seeding part will use it later.
  getAdminPassword();

  console.log('seed: checks passed. wiping the development database...');

  // step 3: open the database connection.
  const prisma = createSeedClient();

  try {
    // step 4: clear every table and restart the ids.
    await resetDatabase(prisma);
    console.log('seed: wipe done. all tables are empty and ids restart at 1.');
  } finally {
    // step 5: always close the connection, even after an error. an open connection
    // would keep the script running and never let it exit.
    await prisma.$disconnect();
  }
}

// start the seed and handle any error in one place.
main().catch((error: unknown) => {
  // only the message is printed. safety: never print the whole error object, because
  // database errors can carry connection details.
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(message);

  // a non-zero exit code tells npm and prisma that the seed failed.
  process.exitCode = 1;
});