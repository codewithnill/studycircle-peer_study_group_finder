// import: the 400 error class, so a test can check that a bad exam range is refused with the right kind of error.
import { BadRequestException } from '@nestjs/common';
// import type: the shapes of the real database service and the search query. only the types are borrowed, so no database code loads here.
import type { PrismaService } from '../prisma/prisma.service';
import type { SearchGroupsDto } from './dto/search-groups.dto';
// import: the fixed words from the generated client (group status, member status, mode, and the search case word),
// so the expected queries use exactly the same words as the service.
import { GroupMemberStatus, GroupStatus, Mode, Prisma } from '../generated/prisma/client';
// import: the box a list reply comes in. the response interceptor looks for it to add "meta".
import { PaginatedResult } from '../common/pagination/pagination';
// import: the message for a bad exam range.
import { EXAM_RANGE_INVALID_MESSAGE } from './groups.constants';
// import: the service under test and its card select list, so the test can check the exact query.
import { GROUP_CARD_SELECT, GroupsService } from './groups.service';

// one group row, the same shape the database gives back for the card query.
// the exam date is a Date at midnight utc, the same way prisma gives back a date-only column.
const ROW = {
  id: 26,
  title: 'Trees and graphs exam prep',
  topic: null,
  examDate: new Date('2026-12-20T00:00:00.000Z'),
  mode: Mode.online,
  location: null,
  maxSize: 8,
  createdAt: new Date('2026-11-21T19:56:21.926Z'),
  subject: { id: 2, name: 'Algorithms' },
  level: { id: 2, name: 'Intermediate' },
  leader: { id: 2, name: 'Anika Rahman' },
  _count: { members: 1 },
};

// builds a fake database with only the two methods the search uses: count and findMany.
// the fake has no $transaction on purpose: the search must not use one (see the note in the service).
// if the service ever calls it, the test fails with "not a function".
// every call is saved in "calls", so a test can check which query the service sent.
// the fake gives back the rows and the total it was handed.
function makeService(rows: unknown[] = [], total = 0) {
  // the saved arguments of each count and findMany call.
  const calls: { count: unknown[]; findMany: unknown[] } = { count: [], findMany: [] };

  // the fake prisma object. "Promise.resolve" makes each method act like a real database call that finishes later.
  const prisma = {
    group: {
      count: (args: unknown) => {
        calls.count.push(args);
        return Promise.resolve(total);
      },
      findMany: (args: unknown) => {
        calls.findMany.push(args);
        return Promise.resolve(rows);
      },
    },
  };

  // "as unknown as PrismaService" tells typescript to accept the small fake in place of the full service.
  return { service: new GroupsService(prisma as unknown as PrismaService), calls };
}

// today as midnight utc, worked out the same way the service does it.
// note: if a test ever runs exactly at midnight utc, the two "todays" could differ by one day. that is very unlikely.
function todayMidnightUtc(): Date {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

// the condition that hides past exams. it is always the first item in "AND".
function pastExamRule() {
  return { OR: [{ examDate: null }, { examDate: { gte: todayMidnightUtc() } }] };
}

// builds the full filter the service should send. "extra" adds the top-level filters,
// and "conditions" adds items after the past-exam rule.
// note: toEqual() treats a field set to undefined the same as a missing field, so missing filters need no special care.
function expectedWhere(extra: object = {}, conditions: object[] = []) {
  return {
    deletedAt: null,
    status: GroupStatus.active,
    ...extra,
    AND: [pastExamRule(), ...conditions],
  };
}

// describe, it and expect are jest tools. they are available without an import.
describe('GroupsService.searchGroups', () => {
  // safety: with no filters, only active, not deleted groups with no past exam may appear.
  // the count and the page must use the same filter, so the total always matches the list.
  it('shows only active, live groups whose exam has not passed', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({} as SearchGroupsDto);

    expect(calls.count).toEqual([{ where: expectedWhere() }]);
    expect(calls.findMany).toHaveLength(1);
    expect((calls.findMany[0] as { where: unknown }).where).toEqual(expectedWhere());
  });

  // the default sort is "newest", with the id as the tie-break, so pages never repeat or skip a group.
  it('sorts by newest first by default, with the id as the tie-break', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({} as SearchGroupsDto);

    expect(calls.findMany[0]).toMatchObject({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: GROUP_CARD_SELECT,
    });
  });

  // "exam soonest" puts the nearest exam first and groups with no exam date last.
  it('sorts by the nearest exam first, with no exam date last', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ sort: 'exam_soonest' } as SearchGroupsDto);

    expect(calls.findMany[0]).toMatchObject({
      orderBy: [{ examDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    });
  });

  // the default page is 1 with 10 groups, so the database skips nothing and reads 10.
  it('reads the first page of 10 by default', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({} as SearchGroupsDto);

    expect(calls.findMany[0]).toMatchObject({ skip: 0, take: 10 });
  });

  // page 3 with 5 per page skips the first two pages (10 groups) and reads 5.
  it('skips the earlier pages when a later page is asked for', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ page: '3', limit: '5' } as SearchGroupsDto);

    expect(calls.findMany[0]).toMatchObject({ skip: 10, take: 5 });
  });

  // a bad page or limit is fixed, never refused (api shape rules, section 4). a too-big limit is cut down to 50.
  it('fixes a bad page and cuts a too-big limit down to 50', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ page: 'abc', limit: '500' } as SearchGroupsDto);

    expect(calls.findMany[0]).toMatchObject({ skip: 0, take: 50 });
  });

  // the subject, level, and mode filters go straight into the filter as exact matches.
  it('adds the subject, level and mode filters', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ subjectId: 2, levelId: 3, mode: Mode.in_person } as SearchGroupsDto);

    expect(calls.count).toEqual([
      { where: expectedWhere({ subjectId: 2, levelId: 3, mode: Mode.in_person }) },
    ]);
  });

  // the search text looks in the title or the topic, ignoring upper and lower case.
  it('looks for the search text in the title or the topic, ignoring case', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ q: 'graph' } as SearchGroupsDto);

    expect(calls.count).toEqual([
      {
        where: expectedWhere({}, [
          {
            OR: [
              { title: { contains: 'graph', mode: Prisma.QueryMode.insensitive } },
              { topic: { contains: 'graph', mode: Prisma.QueryMode.insensitive } },
            ],
          },
        ]),
      },
    ]);
  });

  // the location filter finds the words anywhere in the location, ignoring case.
  it('looks for the location text anywhere in the location, ignoring case', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ location: 'dhaka' } as SearchGroupsDto);

    expect(calls.count).toEqual([
      {
        where: expectedWhere({}, [
          { location: { contains: 'dhaka', mode: Prisma.QueryMode.insensitive } },
        ]),
      },
    ]);
  });

  // the exam range keeps groups whose exam falls on or between the two days.
  it('keeps only exams on or between the two exam days', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ examFrom: '2026-12-01', examTo: '2026-12-31' } as SearchGroupsDto);

    expect(calls.count).toEqual([
      {
        where: expectedWhere({}, [
          {
            examDate: {
              gte: new Date('2026-12-01T00:00:00.000Z'),
              lte: new Date('2026-12-31T00:00:00.000Z'),
            },
          },
        ]),
      },
    ]);
  });

  // one side of the range alone works too. here only the last day is given.
  it('accepts only the last exam day', async () => {
    const { service, calls } = makeService();

    await service.searchGroups({ examTo: '2026-12-10' } as SearchGroupsDto);

    expect(calls.count).toEqual([
      {
        where: expectedWhere({}, [
          { examDate: { gte: undefined, lte: new Date('2026-12-10T00:00:00.000Z') } },
        ]),
      },
    ]);
  });

  // a range whose first day comes after its last day can never match, so it is refused with a clear 400.
  // the database is never asked.
  it('refuses an exam range that ends before it starts, without asking the database', async () => {
    const { service, calls } = makeService();
    const dto = { examFrom: '2026-12-20', examTo: '2026-12-01' } as SearchGroupsDto;

    await expect(service.searchGroups(dto)).rejects.toThrow(BadRequestException);
    await expect(service.searchGroups(dto)).rejects.toThrow(EXAM_RANGE_INVALID_MESSAGE);
    expect(calls.count).toEqual([]);
    expect(calls.findMany).toEqual([]);
  });

  // the reply is a list box with cards and a meta block. each card has seats left worked out,
  // the exam date as plain day text, and no raw "_count" field.
  it('gives back group cards with seats left and the meta block', async () => {
    const { service } = makeService([ROW], 13);

    const result = await service.searchGroups({} as SearchGroupsDto);

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toEqual([
      {
        id: 26,
        title: 'Trees and graphs exam prep',
        topic: null,
        examDate: '2026-12-20',
        mode: Mode.online,
        location: null,
        maxSize: 8,
        memberCount: 1,
        seatsLeft: 7,
        createdAt: new Date('2026-11-21T19:56:21.926Z'),
        subject: { id: 2, name: 'Algorithms' },
        level: { id: 2, name: 'Intermediate' },
        leader: { id: 2, name: 'Anika Rahman' },
      },
    ]);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 13, totalPages: 2 });
  });

  // a group with no exam date keeps null, and a full group shows 0 seats, never a negative number.
  it('keeps a missing exam date as null and never shows fewer than 0 seats', async () => {
    const fullRow = { ...ROW, examDate: null, maxSize: 4, _count: { members: 5 } };
    const { service } = makeService([fullRow], 1);

    const result = await service.searchGroups({} as SearchGroupsDto);

    expect(result.items[0]).toMatchObject({ examDate: null, memberCount: 5, seatsLeft: 0 });
  });

  // an empty result is a normal answer, not an error. the frontend shows "Create your own group" for it.
  it('gives back an empty page when nothing matches', async () => {
    const { service } = makeService([], 0);

    const result = await service.searchGroups({ q: 'quantum' } as SearchGroupsDto);

    expect(result.items).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  // safety: the card select list must hold only the safe card fields.
  // if someone adds a field later (like description or is_flagged), this test fails and forces a decision.
  it('asks the database only for the safe card fields', () => {
    expect(Object.keys(GROUP_CARD_SELECT).sort()).toEqual([
      '_count',
      'createdAt',
      'examDate',
      'id',
      'leader',
      'level',
      'location',
      'maxSize',
      'mode',
      'subject',
      'title',
      'topic',
    ]);
  });

  // safety: the leader is sent only by id and name, never with an email.
  // the member count counts only active members, so a member who left or was removed frees a seat.
  it('sends the leader without an email and counts only active members', () => {
    expect(GROUP_CARD_SELECT.leader).toEqual({ select: { id: true, name: true } });
    expect(GROUP_CARD_SELECT._count).toEqual({
      select: { members: { where: { status: GroupMemberStatus.active } } },
    });
  });
});