// this file creates the small lists that filters and forms use: levels and subjects.
// it also links each student to the subjects they are interested in.

// borrows the client type only. the client itself is passed in from seed.ts.
import type { PrismaClient } from '../../src/generated/prisma/client';
// borrows the random helper type.
import type { SeededRandom } from './random';
// borrows the fake level and subject lists from data.ts.
import { LEVELS, SUBJECTS } from './data';

// the small shape of a saved level or subject. later steps need only the id and the name.
export interface IdAndName {
  id: number;
  name: string;
}

// what this file hands back to the next seed steps.
export interface SeededLookups {
  levels: IdAndName[];
  subjects: IdAndName[];
}

// creates levels, subjects, and student interests, then returns the saved levels and subjects.
export async function seedLookups(
  prisma: PrismaClient,
  studentIds: number[],
  rng: SeededRandom,
): Promise<SeededLookups> {
  // these lists collect the saved rows.
  const levels: IdAndName[] = [];
  const subjects: IdAndName[] = [];

  // create the three levels. the list in data.ts is already in menu order.
  for (const level of LEVELS) {
    const saved = await prisma.level.create({
      data: {
        name: level.name,
        description: level.description,
        sortOrder: level.sortOrder,
      },
      // only the id and the name are needed back.
      select: { id: true, name: true },
    });
    levels.push(saved);
  }

  // create the twelve subjects.
  for (const subject of SUBJECTS) {
    const saved = await prisma.subject.create({
      data: {
        name: subject.name,
        category: subject.category,
        courseCode: subject.courseCode,
      },
      select: { id: true, name: true },
    });
    subjects.push(saved);
  }

  // build the student-to-subject links. each student likes two to four different subjects.
  const interests: { userId: number; subjectId: number }[] = [];
  for (const userId of studentIds) {
    // sample() never picks the same subject twice, so the (userId, subjectId) pair stays unique.
    for (const subject of rng.sample(subjects, rng.int(2, 4))) {
      interests.push({ userId, subjectId: subject.id });
    }
  }

  // save all links with one command, which is faster than one command per row.
  await prisma.userSubject.createMany({ data: interests });

  // hand the saved levels and subjects to the next steps.
  return { levels, subjects };
}