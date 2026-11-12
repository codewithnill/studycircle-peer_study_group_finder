// this is the entry file for the seed script. "npx prisma db seed" runs it.
// it checks safety, wipes the database, fills it with fake demo data, and checks the result.

// loads backend/.env into process.env. this must stay the first import,
// so the variables exist before any other file reads them.
import 'dotenv/config';
// borrows the two safety checks from guards.ts.
import { assertSafeToSeed, getAdminPassword } from './seed/guards';
// borrows the function that builds the seed database connection.
import { createSeedClient } from './seed/client';
// borrows the function that clears every table.
import { resetDatabase } from './seed/reset';
// borrows the random maker that repeats itself. one shared instance keeps the data repeatable.
import { SeededRandom } from './seed/random';
// borrows the seed steps. each one has one job.
import { seedUsers } from './seed/seed-users';
import { seedLookups } from './seed/seed-lookups';
import { seedGroups } from './seed/seed-groups';
import { seedSessions } from './seed/seed-sessions';
import { seedChat } from './seed/seed-chat';
// borrows the final rule checks.
import { verifySeed } from './seed/verify';

// runs the whole seed from start to end.
async function main(): Promise<void> {
  // step 1: refuse production and non-local databases. an error here stops everything.
  assertSafeToSeed();

  // step 2: check the admin password now, before the wipe, so a bad setup never leaves
  // the database empty.
  const adminPassword = getAdminPassword();

  console.log('seed: checks passed. wiping the development database...');

  // step 3: open the database connection.
  const prisma = createSeedClient();

  try {
    // step 4: clear every table and restart the ids.
    await resetDatabase(prisma);
    console.log('seed: wipe done.');

    // one random maker is shared by every step, so the whole run is repeatable.
    const rng = new SeededRandom();

    // step 5: create the admin and the students.
    const users = await seedUsers(prisma, adminPassword, rng);

    // step 6: create levels and subjects, and link students to subjects.
    const lookups = await seedLookups(prisma, users.studentIds, rng);

    // step 7: create groups with members and join requests. the saved groups are kept,
    // because sessions and chat need them.
    const groups = await seedGroups(prisma, users.studentIds, lookups, rng);

    // step 8: create sessions, attendance, and reviews.
    await seedSessions(prisma, groups, rng);

    // step 9: create chat messages and group posts.
    await seedChat(prisma, groups, rng);

    // step 10: read the data back and check every rule. an error here makes the seed fail.
    await verifySeed(prisma);

    // step 11: print how many rows each table holds, so the result is easy to check.
    const [userCount, levelCount, subjectCount, groupCount, memberCount, requestCount] = await Promise.all([
      prisma.user.count(),
      prisma.level.count(),
      prisma.subject.count(),
      prisma.group.count(),
      prisma.groupMember.count(),
      prisma.joinRequest.count(),
    ]);
    const [sessionCount, attendanceCount, reviewCount, messageCount, postCount] = await Promise.all([
      prisma.studySession.count(),
      prisma.sessionAttendance.count(),
      prisma.review.count(),
      prisma.message.count(),
      prisma.groupPost.count(),
    ]);
    console.log(
      `seed: done. users ${userCount}, levels ${levelCount}, subjects ${subjectCount}, ` +
        `groups ${groupCount}, group members ${memberCount}, join requests ${requestCount}.`,
    );
    console.log(
      `seed: sessions ${sessionCount}, attendance ${attendanceCount}, reviews ${reviewCount}, ` +
        `messages ${messageCount}, posts ${postCount}.`,
    );
  } finally {
    // step 12: always close the connection, even after an error. an open connection
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