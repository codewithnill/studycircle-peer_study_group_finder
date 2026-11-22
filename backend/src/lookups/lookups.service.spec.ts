// import type: the shape of the real database service. only the type is borrowed, so no database code loads here.
import type { PrismaService } from '../prisma/prisma.service';
// import: the service under test and its two select lists, so the test can check the exact query.
import { LEVEL_OPTION_SELECT, LookupsService, SUBJECT_OPTION_SELECT } from './lookups.service';

// builds a fake database with only the two methods the service calls.
// every call is saved in "calls", so a test can check which query the service sent.
// the fake gives back the rows it was handed, so a test can check that the service passes them on unchanged.
function makeService(subjectRows: unknown[] = [], levelRows: unknown[] = []) {
  // the saved arguments of each findMany call.
  const calls: { subject: unknown[]; level: unknown[] } = { subject: [], level: [] };

  // the fake prisma object. "Promise.resolve" makes each method act like a real database call that finishes later.
  const prisma = {
    subject: {
      findMany: (args: unknown) => {
        calls.subject.push(args);
        return Promise.resolve(subjectRows);
      },
    },
    level: {
      findMany: (args: unknown) => {
        calls.level.push(args);
        return Promise.resolve(levelRows);
      },
    },
  };

  // "as unknown as PrismaService" tells typescript to accept the small fake in place of the full service.
  return { service: new LookupsService(prisma as unknown as PrismaService), calls };
}

// describe, it and expect are jest tools. they are available without an import.
describe('LookupsService', () => {
  // the subject list must ask only for active rows, sorted by name, with only the dropdown fields.
  it('reads only active subjects, sorted by name, with the safe fields', async () => {
    const rows = [{ id: 2, name: 'Calculus', category: 'Math', courseCode: 'MAT101' }];
    const { service, calls } = makeService(rows);

    // the service must give back exactly the rows the database gave.
    await expect(service.listActiveSubjects()).resolves.toEqual(rows);

    // the service must send exactly one query, and it must be this one.
    expect(calls.subject).toEqual([
      { where: { isActive: true }, orderBy: { name: 'asc' }, select: SUBJECT_OPTION_SELECT },
    ]);
  });

  // the level list must ask only for active rows, in sort_order, with the id as the tie-breaker.
  it('reads only active levels, in sort order, with the safe fields', async () => {
    const rows = [{ id: 1, name: 'Beginner', description: 'New to the subject' }];
    const { service, calls } = makeService([], rows);

    await expect(service.listActiveLevels()).resolves.toEqual(rows);

    expect(calls.level).toEqual([
      {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: LEVEL_OPTION_SELECT,
      },
    ]);
  });

  // safety: the subject select list must hold only the four dropdown fields.
  // if someone adds a field later, this test fails and forces a decision about whether it is safe to send.
  it('sends only id, name, category and course code for a subject', () => {
    expect(Object.keys(SUBJECT_OPTION_SELECT).sort()).toEqual(['category', 'courseCode', 'id', 'name']);
  });

  // safety: the level select list must hold only the three dropdown fields.
  it('sends only id, name and description for a level', () => {
    expect(Object.keys(LEVEL_OPTION_SELECT).sort()).toEqual(['description', 'id', 'name']);
  });
});