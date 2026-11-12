// this file clears every table so the seed always starts from a clean database.
// it only runs after the guards pass, so it can never touch production.

// borrows the client type only. "import type" means the line is used for type checking
// and disappears when the script runs, because the client is passed in from outside.
import type { PrismaClient } from '../../src/generated/prisma/client';

// removes all rows from all 17 tables and restarts the id counters at 1.
// the client is passed in, so this file does not create its own connection.
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  // safety: raw sql is used here on purpose. prisma has no single command that clears
  // many linked tables and resets their id counters. the table names below are fixed
  // text in the code, and no user input is mixed in, so sql injection is not possible.
  // truncate removes every row at once.
  // restart identity makes the next id start from 1 again.
  // cascade also clears any table that points to the listed tables.
  // the _prisma_migrations table is not listed, so the migration history stays safe.
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "admin_actions",
      "reports",
      "notifications",
      "group_files",
      "group_posts",
      "messages",
      "reviews",
      "session_attendance",
      "study_sessions",
      "join_requests",
      "group_members",
      "groups",
      "user_subjects",
      "refresh_tokens",
      "levels",
      "subjects",
      "users"
    RESTART IDENTITY CASCADE
  `;

  // quick check that the wipe really worked. a non-empty users table means something went wrong.
  const remainingUsers = await prisma.user.count();

  // stop the script if rows are left, so new data is never mixed with old data.
  if (remainingUsers !== 0) {
    throw new Error('seed wipe failed: the users table is not empty.');
  }
}