// this file creates the demo accounts: one admin and thirty students.
// it only runs after the guards pass and the database has been wiped.

// borrows the bcrypt "hash" function. it turns a password into a scrambled string
// that cannot be turned back into the password.
import { hash } from 'bcrypt';
// borrows the client type only. the client itself is passed in from seed.ts.
import type { PrismaClient } from '../../src/generated/prisma/client';
// borrows the random helper type. the same random maker is shared by every seed file.
import type { SeededRandom } from './random';
// borrows the fake account settings and word lists from data.ts.
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  BCRYPT_ROUNDS,
  DEMO_STUDENT_PASSWORD,
  DEPARTMENTS,
  FIRST_NAMES,
  LAST_NAMES,
  STUDENT_BIOS,
  STUDENT_COUNT,
  STUDENT_EMAIL_DOMAIN,
} from './data';

// what this file hands back to the next seed steps.
export interface SeededUsers {
  // the id of the admin account.
  adminId: number;
  // the ids of all students, in the order they were created.
  studentIds: number[];
}

// creates the admin and the students, and returns their ids.
export async function seedUsers(
  prisma: PrismaClient,
  adminPassword: string,
  rng: SeededRandom,
): Promise<SeededUsers> {
  // there must be enough fake first names, or two students would share a name.
  if (STUDENT_COUNT > FIRST_NAMES.length) {
    throw new Error('seed-users: STUDENT_COUNT is bigger than the list of first names.');
  }

  // safety: passwords are hashed before they are saved. plain text is never stored.
  // the admin password comes from backend/.env and is checked by guards.ts.
  const adminHash = await hash(adminPassword, BCRYPT_ROUNDS);

  // all students share one demo password, so it is hashed once and the result is reused.
  // this keeps the seed fast, because hashing is slow on purpose.
  const studentHash = await hash(DEMO_STUDENT_PASSWORD, BCRYPT_ROUNDS);

  // create the admin. only the id is needed back.
  const admin = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      role: 'admin',
    },
    select: { id: true },
  });

  // this list collects the student ids.
  const studentIds: number[] = [];

  // create the students one by one. the loop is short, and one by one keeps the id order clear.
  for (let i = 0; i < STUDENT_COUNT; i++) {
    // build a number like "01", "02", ... "30" for the email.
    const number = String(i + 1).padStart(2, '0');

    // the last name uses a step of 7 through the list. 7 and 30 share no common factor,
    // so every last name is used once before any repeats.
    const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length];

    const student = await prisma.user.create({
      data: {
        name: `${FIRST_NAMES[i]} ${lastName}`,
        email: `student${number}@${STUDENT_EMAIL_DOMAIN}`,
        passwordHash: studentHash,
        role: 'student',
        department: rng.pick(DEPARTMENTS),
        // years of study from 1 to 4.
        academicYear: rng.int(1, 4),
        // about seven out of ten students have a bio.
        bio: rng.chance(0.7) ? rng.pick(STUDENT_BIOS) : null,
      },
      select: { id: true },
    });

    // remember the new student's id.
    studentIds.push(student.id);
  }

  // hand the ids to the next steps.
  return { adminId: admin.id, studentIds };
}