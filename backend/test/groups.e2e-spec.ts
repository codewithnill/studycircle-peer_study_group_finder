// imports the type of a built nestjs app, so the variable below has a clear type.
import type { INestApplication } from '@nestjs/common';
// imports supertest. it sends http requests to the app in memory and checks the replies.
import request from 'supertest';
// imports the server type that supertest expects.
import type { App } from 'supertest/types';
// imports the prisma client type, the type tools, and the fixed words the test needs.
// "Prisma" gives the type of the data a new group row may hold, so the search helper below is checked by typescript.
// safety: the fixed words come from the generated client and are never typed by hand.
import {
  GroupMemberRole,
  GroupMemberStatus,
  GroupStatus,
  Mode,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client';
// imports the helpers that build the test database client and empty every table.
import { cleanDatabase, createTestPrisma } from './support/clean-database';
// imports the helper that builds the test app with the same setup as the real server.
import { createTestApp } from './support/create-test-app';
// imports the helper that registers and logs in a test account through the real routes.
import { LoggedInAccount, registerAndLogin } from './support/login-helper';

// the exact messages the frontend relies on. they are written out on purpose,
// so a changed message makes this test fail and forces a decision.
const UNAUTHENTICATED_MESSAGE = 'Please log in to continue';
const GROUP_NOT_FOUND_MESSAGE = 'This group does not exist';
const SUBJECT_NOT_FOUND_MESSAGE = 'This subject does not exist';
const LEVEL_NOT_FOUND_MESSAGE = 'This level does not exist';
const LEADER_ONLY_MESSAGE = 'Only the group leader can do this';
const LOCATION_REQUIRED_MESSAGE = 'An in-person group needs a location';
const EXAM_DATE_IN_PAST_MESSAGE = 'The exam date cannot be in the past';
const SIZE_BELOW_MEMBERS_MESSAGE = 'The group already has more members than this size';
const NOTHING_TO_UPDATE_MESSAGE = 'Send at least one field to change';
const EXAM_RANGE_INVALID_MESSAGE = 'The first exam day cannot be after the last exam day';

// the test accounts.
// safety: these are made-up passwords for the empty test database only.
const LEADER = { name: 'Group Leader', email: 'leader@example.com', password: 'correct-horse-9' };
const OTHER = { name: 'Other Student', email: 'other@example.com', password: 'correct-horse-9' };
const THIRD = { name: 'Third Student', email: 'third@example.com', password: 'correct-horse-9' };

// the exact keys of a group page, sorted a to z.
const GROUP_KEYS = [
  'created_at',
  'description',
  'exam_date',
  'id',
  'leader',
  'level',
  'location',
  'max_size',
  'member_count',
  'members_can_post',
  'mode',
  'my_role',
  'seats_left',
  'status',
  'subject',
  'title',
  'topic',
];

// the exact keys of a group card in the search, sorted a to z.
// safety: no description, status, my_role, is_flagged, or email.
const CARD_KEYS = [
  'created_at',
  'exam_date',
  'id',
  'leader',
  'level',
  'location',
  'max_size',
  'member_count',
  'mode',
  'seats_left',
  'subject',
  'title',
  'topic',
];

// builds the three-key error body, so each check reads in one short line.
function errorBody(statusCode: number, message: string) {
  return { status_code: statusCode, message, errors: [] };
}

// reads the group ids from a search reply, in the order the reply gives them.
function idsOf(body: { data: { id: number }[] }): number[] {
  return body.data.map((card) => card.id);
}

// these tests check the four group routes from the outside, the same way the frontend will call them.
// describe, it, expect, beforeAll, afterAll, beforeEach and afterEach are jest tools. they are available without an import.
describe('group routes (e2e)', () => {
  // the test database client. it sets up states (a hidden subject, an archived group) and reads rows back.
  let prisma: PrismaClient;
  // a fresh app for every test.
  let app: INestApplication<App>;
  // an active subject and an active level, made fresh for every test.
  let subjectId: number;
  let levelId: number;

  // a correct create body (snake_case keys, as the frontend sends them). each test changes what it needs.
  function validBody(extra: Record<string, unknown> = {}) {
    return {
      title: 'Data Structures exam prep',
      subject_id: subjectId,
      level_id: levelId,
      description: 'Weekly practice with past papers.',
      exam_date: '2099-12-15',
      mode: 'online',
      max_size: 5,
      ...extra,
    };
  }

  // creates a group through the real route and gives back the "data" part of the reply.
  async function createGroup(account: LoggedInAccount, extra: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set('Cookie', account.cookie)
      .send(validBody(extra))
      .expect(201);
    return res.body.data;
  }

  // adds a person to a group straight in the test database, as an approved join request would later (week 5).
  async function addMember(groupId: number, userId: number) {
    await prisma.groupMember.create({
      data: { groupId, userId, role: GroupMemberRole.member, status: GroupMemberStatus.active },
    });
  }

  // makes a group and its leader row straight in the test database, and gives back the new group id.
  // the search tests need states the create route refuses on purpose (a past exam, a closed or removed group)
  // and fixed creation times for the sort checks, so they cannot use the real route.
  // "data" changes any field, for example { status: GroupStatus.closed }.
  async function seedGroup(
    leaderId: number,
    data: Partial<Prisma.GroupUncheckedCreateInput> = {},
  ): Promise<number> {
    const group = await prisma.group.create({
      data: {
        title: 'Seed group',
        subjectId,
        levelId,
        leaderId,
        description: 'Made by the test.',
        mode: Mode.online,
        maxSize: 5,
        ...data,
      },
      select: { id: true },
    });
    // every group has its leader as an active member, the same as the create route does.
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: leaderId,
        role: GroupMemberRole.leader,
        status: GroupMemberStatus.active,
      },
    });
    return group.id;
  }

  // sends one search with the given address ending (for example "?subject_id=2") as a logged-in person.
  function search(account: LoggedInAccount, query = '') {
    return request(app.getHttpServer()).get(`/api/v1/groups${query}`).set('Cookie', account.cookie);
  }

  // runs once before all tests. builds the test database client. the guard runs inside the helper.
  beforeAll(() => {
    prisma = createTestPrisma();
  });

  // runs once after all tests. closes the connection, so jest can exit cleanly.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // runs before each test: empty every table, build a fresh app, and make one active subject and level.
  beforeEach(async () => {
    await cleanDatabase(prisma);
    app = await createTestApp();
    subjectId = (await prisma.subject.create({ data: { name: 'Data Structures' } })).id;
    levelId = (await prisma.level.create({ data: { name: 'Beginner', description: 'New to it' } })).id;
  });

  // runs after each test. closes the app and its own database connection.
  afterEach(async () => {
    await app.close();
  });

  // safety: all four routes need a login.
  it('gives 401 on all four routes without a cookie', async () => {
    const server = app.getHttpServer();
    const replies = [
      await request(server).post('/api/v1/groups').send(validBody()),
      await request(server).get('/api/v1/groups'),
      await request(server).get('/api/v1/groups/1'),
      await request(server).patch('/api/v1/groups/1').send({ title: 'New' }),
    ];
    for (const res of replies) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual(errorBody(401, UNAUTHENTICATED_MESSAGE));
    }
  });

  describe('POST /api/v1/groups', () => {
    // the main path: the group and the leader's member row are saved together, and the reply has the safe shape.
    it('creates the group and the leader row together, with the safe reply shape', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const data = await createGroup(leader);

      // exactly the expected keys, so nothing extra (like is_flagged or the leader's email) can leak.
      expect(Object.keys(data).sort()).toEqual(GROUP_KEYS);
      expect(data.leader).toEqual({ id: leader.id, name: LEADER.name });
      expect(data.subject).toEqual({ id: subjectId, name: 'Data Structures' });
      expect(data.level).toEqual({ id: levelId, name: 'Beginner' });
      // the date comes back as plain day text, not a date with a time.
      expect(data.exam_date).toBe('2099-12-15');
      expect(data.my_role).toBe('leader');
      expect(data.member_count).toBe(1);
      expect(data.seats_left).toBe(4);
      expect(data.status).toBe('active');
      expect(data.members_can_post).toBe(false);

      // the database has the leader on the group row and exactly one active leader member row.
      const row = await prisma.group.findUniqueOrThrow({ where: { id: data.id } });
      expect(row.leaderId).toBe(leader.id);
      const members = await prisma.groupMember.findMany({ where: { groupId: data.id } });
      expect(members).toHaveLength(1);
      expect(members[0]).toMatchObject({
        userId: leader.id,
        role: GroupMemberRole.leader,
        status: GroupMemberStatus.active,
      });
    });

    // safety: nobody can choose the leader, the status, or the flag through the body.
    it('refuses leader_id, status and is_flagged in the body, and saves nothing', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const res = await request(app.getHttpServer())
        .post('/api/v1/groups')
        .set('Cookie', leader.cookie)
        .send(validBody({ leader_id: 999, status: 'removed', is_flagged: true }))
        .expect(400);

      // the errors list names each refused field.
      const fields = (res.body.errors as { field: string }[]).map((error) => error.field).sort();
      expect(fields).toEqual(['is_flagged', 'leader_id', 'status']);
      expect(await prisma.group.count()).toBe(0);
    });

    // the two rules the service checks: a location for in-person groups, and no past exam date.
    it('refuses an in-person group without a location and a past exam date', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const server = app.getHttpServer();

      const noLocation = await request(server)
        .post('/api/v1/groups')
        .set('Cookie', leader.cookie)
        .send(validBody({ mode: 'in_person', location: '   ' }))
        .expect(400);
      expect(noLocation.body).toEqual(errorBody(400, LOCATION_REQUIRED_MESSAGE));

      const pastExam = await request(server)
        .post('/api/v1/groups')
        .set('Cookie', leader.cookie)
        .send(validBody({ exam_date: '2000-01-01' }))
        .expect(400);
      expect(pastExam.body).toEqual(errorBody(400, EXAM_DATE_IN_PAST_MESSAGE));

      // with a location, an in-person group is fine. no exam date at all is fine too.
      const ok = await createGroup(leader, { mode: 'in_person', location: 'Library room 2', exam_date: null });
      expect(ok.location).toBe('Library room 2');
      expect(ok.exam_date).toBeNull();
    });

    // a hidden subject or level acts as if it does not exist, and nothing is saved.
    it('gives 404 for a hidden subject or a hidden level, and saves nothing', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const server = app.getHttpServer();
      const hiddenSubject = await prisma.subject.create({ data: { name: 'Old Subject', isActive: false } });
      const hiddenLevel = await prisma.level.create({
        data: { name: 'Old Level', description: 'Gone', isActive: false },
      });

      const badSubject = await request(server)
        .post('/api/v1/groups')
        .set('Cookie', leader.cookie)
        .send(validBody({ subject_id: hiddenSubject.id }))
        .expect(404);
      expect(badSubject.body).toEqual(errorBody(404, SUBJECT_NOT_FOUND_MESSAGE));

      const badLevel = await request(server)
        .post('/api/v1/groups')
        .set('Cookie', leader.cookie)
        .send(validBody({ level_id: hiddenLevel.id }))
        .expect(404);
      expect(badLevel.body).toEqual(errorBody(404, LEVEL_NOT_FOUND_MESSAGE));

      // the transaction rolled back, so no half-made group or member row is left behind.
      expect(await prisma.group.count()).toBe(0);
      expect(await prisma.groupMember.count()).toBe(0);
    });
  });

  describe('GET /api/v1/groups (search)', () => {
    // safety: only active, live groups whose exam has not passed may appear.
    // closed, archived, removed, deleted, and past-exam groups stay hidden. a full group still shows.
    it('shows only active groups with no past exam, as safe cards with a meta block', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const other = await registerAndLogin(app, OTHER);

      // three groups that must appear.
      const future = await seedGroup(leader.id, { examDate: new Date('2099-06-01T00:00:00.000Z') });
      const noExam = await seedGroup(leader.id);
      const full = await seedGroup(leader.id, { maxSize: 2 });
      await addMember(full, other.id);

      // five groups that must stay hidden.
      await seedGroup(leader.id, { status: GroupStatus.closed });
      await seedGroup(leader.id, { status: GroupStatus.archived });
      await seedGroup(leader.id, { status: GroupStatus.removed });
      await seedGroup(leader.id, { deletedAt: new Date() });
      await seedGroup(leader.id, { examDate: new Date('2000-01-01T00:00:00.000Z') });

      const res = await search(other).expect(200);

      // exactly the three visible groups.
      expect(idsOf(res.body).sort((a, b) => a - b)).toEqual([future, noExam, full].sort((a, b) => a - b));
      expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 3, total_pages: 1 });

      // every card has exactly the safe keys.
      for (const card of res.body.data as Record<string, unknown>[]) {
        expect(Object.keys(card).sort()).toEqual(CARD_KEYS);
      }

      // the exam date is plain day text, and a full group shows 0 seats.
      const cards = res.body.data as { id: number; exam_date: string | null; seats_left: number }[];
      expect(cards.find((card) => card.id === future)?.exam_date).toBe('2099-06-01');
      expect(cards.find((card) => card.id === full)).toMatchObject({ member_count: 2, seats_left: 0 });

      // safety: the leader's email is never in the reply. a true/false check keeps the output short.
      expect(JSON.stringify(res.body).includes(LEADER.email)).toBe(false);
    });

    // every filter narrows the list. text filters ignore upper and lower case, and an empty value means "no filter".
    it('narrows the list with each filter', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const otherSubject = (await prisma.subject.create({ data: { name: 'Calculus' } })).id;
      const otherLevel = (await prisma.level.create({ data: { name: 'Advanced', description: 'Deep' } })).id;

      const trees = await seedGroup(leader.id, {
        title: 'Trees and Graphs',
        topic: 'graph search',
        location: 'Dhaka University',
        examDate: new Date('2099-03-10T00:00:00.000Z'),
      });
      const limits = await seedGroup(leader.id, {
        title: 'Limits',
        topic: 'derivatives',
        subjectId: otherSubject,
        levelId: otherLevel,
        mode: Mode.in_person,
        location: 'Chittagong campus',
        examDate: new Date('2099-09-20T00:00:00.000Z'),
      });

      // each address ending and the groups it must find.
      const cases: [string, number[]][] = [
        [`?subject_id=${otherSubject}`, [limits]],
        [`?level_id=${levelId}`, [trees]],
        ['?mode=in_person', [limits]],
        ['?location=DHAKA', [trees]],
        ['?q=GRAPH', [trees]],
        ['?q=derivatives', [limits]],
        ['?exam_from=2099-01-01&exam_to=2099-06-30', [trees]],
        ['?exam_from=2099-09-20&exam_to=2099-09-20', [limits]],
        ['?subject_id=&mode=&q=', [trees, limits]],
      ];

      for (const [query, expected] of cases) {
        const res = await search(leader, query).expect(200);
        expect(idsOf(res.body).sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b));
      }
    });

    // newest first by default, nearest exam first on request, the id as the tie-break,
    // and pages that never repeat or skip a group.
    it('sorts and pages the results without repeats or gaps', async () => {
      const leader = await registerAndLogin(app, LEADER);

      // five groups with fixed creation times. "tieOld" and "tieNew" share the same time, so the id must break the tie.
      const oldest = await seedGroup(leader.id, {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        examDate: new Date('2099-05-01T00:00:00.000Z'),
      });
      const middle = await seedGroup(leader.id, { createdAt: new Date('2026-02-01T00:00:00.000Z') });
      const newest = await seedGroup(leader.id, {
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        examDate: new Date('2099-01-10T00:00:00.000Z'),
      });
      const tieOld = await seedGroup(leader.id, { createdAt: new Date('2025-12-01T00:00:00.000Z') });
      const tieNew = await seedGroup(leader.id, { createdAt: new Date('2025-12-01T00:00:00.000Z') });

      // newest first. the two groups with the same time come with the bigger id first.
      const byNewest = await search(leader).expect(200);
      expect(idsOf(byNewest.body)).toEqual([newest, middle, oldest, tieNew, tieOld]);

      // nearest exam first. groups with no exam date come last, with the smaller id first.
      const byExam = await search(leader, '?sort=exam_soonest').expect(200);
      expect(idsOf(byExam.body)).toEqual([newest, oldest, middle, tieOld, tieNew]);

      // three pages of 2. put together, they hold every group exactly once, in the same order as one big page.
      const page1 = await search(leader, '?page=1&limit=2').expect(200);
      const page2 = await search(leader, '?page=2&limit=2').expect(200);
      const page3 = await search(leader, '?page=3&limit=2').expect(200);
      expect([...idsOf(page1.body), ...idsOf(page2.body), ...idsOf(page3.body)]).toEqual(idsOf(byNewest.body));
      expect(page2.body.meta).toEqual({ page: 2, limit: 2, total: 5, total_pages: 3 });

      // a page past the end is an empty list with the same meta numbers, not an error.
      const pastEnd = await search(leader, '?page=4&limit=2').expect(200);
      expect(pastEnd.body).toEqual({ data: [], meta: { page: 4, limit: 2, total: 5, total_pages: 3 } });
    });

    // an empty result is a normal answer. the frontend shows a "Create your own group" button for it.
    it('gives an empty list, not an error, when nothing matches', async () => {
      const leader = await registerAndLogin(app, LEADER);
      await seedGroup(leader.id, { title: 'Trees and Graphs' });

      const res = await search(leader, '?q=quantum').expect(200);
      expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 10, total: 0, total_pages: 0 } });
    });

    // bad input is refused with 400 and a clear reply, before anything reaches the database.
    it('refuses a bad exam range, a bad id and an unknown key', async () => {
      const leader = await registerAndLogin(app, LEADER);

      // the first exam day comes after the last one.
      const badRange = await search(leader, '?exam_from=2099-12-20&exam_to=2099-12-01').expect(400);
      expect(badRange.body).toEqual(errorBody(400, EXAM_RANGE_INVALID_MESSAGE));

      // a word can never be an id. every error names the field in snake_case.
      const badId = await search(leader, '?subject_id=abc').expect(400);
      expect(badId.body.message).toBe('Validation failed');
      const fields = (badId.body.errors as { field: string }[]).map((error) => error.field);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((field) => field === 'subject_id')).toBe(true);

      // safety: a key the search does not list is refused, so nobody can ask for removed groups.
      const unknownKey = await search(leader, '?status=removed').expect(400);
      expect(unknownKey.body).toEqual({
        status_code: 400,
        message: 'Validation failed',
        errors: [{ field: 'status', message: 'property status should not exist' }],
      });
    });
  });

  describe('GET /api/v1/groups/:id', () => {
    // another student sees the group page, with no role and no private details.
    it('shows an active group to another student, with no role and no email', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const other = await registerAndLogin(app, OTHER);
      const group = await createGroup(leader);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/groups/${group.id}`)
        .set('Cookie', other.cookie)
        .expect(200);

      expect(res.body.data.my_role).toBeNull();
      expect(res.body.data.title).toBe('Data Structures exam prep');
      // safety: the leader's email is never in the reply. a true/false check keeps the output short.
      expect(JSON.stringify(res.body).includes(LEADER.email)).toBe(false);
    });

    // safety: every hidden case gives the same 404 as an unknown id.
    it('gives the same 404 for an unknown id, a word, a removed group and a deleted group', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const removed = await createGroup(leader);
      const deleted = await createGroup(leader);
      await prisma.group.update({ where: { id: removed.id }, data: { status: GroupStatus.removed } });
      await prisma.group.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

      for (const id of ['99999', 'abc', String(removed.id), String(deleted.id)]) {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/groups/${id}`)
          .set('Cookie', leader.cookie)
          .expect(404);
        expect(res.body).toEqual(errorBody(404, GROUP_NOT_FOUND_MESSAGE));
      }
    });

    // an archived group is kept for history: its members may open it, everyone else gets 404.
    it('shows an archived group to its members only', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const other = await registerAndLogin(app, OTHER);
      const group = await createGroup(leader);
      await prisma.group.update({ where: { id: group.id }, data: { status: GroupStatus.archived } });

      await request(app.getHttpServer())
        .get(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/groups/${group.id}`)
        .set('Cookie', other.cookie)
        .expect(404);
      expect(res.body).toEqual(errorBody(404, GROUP_NOT_FOUND_MESSAGE));
    });
  });

  describe('PATCH /api/v1/groups/:id', () => {
    // the leader can change fields, and the database really changes.
    it('lets the leader change the details', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const group = await createGroup(leader);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .send({ title: '  Trees and graphs  ', max_size: 8, level_id: null, members_can_post: true })
        .expect(200);

      expect(res.body.data).toMatchObject({
        title: 'Trees and graphs',
        max_size: 8,
        seats_left: 7,
        level: null,
        members_can_post: true,
      });
      const row = await prisma.group.findUniqueOrThrow({ where: { id: group.id } });
      expect(row).toMatchObject({ title: 'Trees and graphs', maxSize: 8, levelId: null, membersCanPost: true });
    });

    // an empty change is most likely a form mistake.
    it('refuses an empty body with the plain sentence', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const group = await createGroup(leader);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .send({})
        .expect(400);
      expect(res.body).toEqual(errorBody(400, NOTHING_TO_UPDATE_MESSAGE));
    });

    // safety: only the leader may edit. a member and a stranger get 403, and nothing changes.
    // for an archived group, a stranger gets 404, because they may not even see it.
    it('refuses everyone but the leader', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const member = await registerAndLogin(app, OTHER);
      const stranger = await registerAndLogin(app, THIRD);
      const group = await createGroup(leader);
      await addMember(group.id, member.id);

      for (const person of [member, stranger]) {
        const res = await request(app.getHttpServer())
          .patch(`/api/v1/groups/${group.id}`)
          .set('Cookie', person.cookie)
          .send({ title: 'Taken over' })
          .expect(403);
        expect(res.body).toEqual(errorBody(403, LEADER_ONLY_MESSAGE));
      }
      const row = await prisma.group.findUniqueOrThrow({ where: { id: group.id } });
      expect(row.title).toBe('Data Structures exam prep');

      await prisma.group.update({ where: { id: group.id }, data: { status: GroupStatus.archived } });
      const hidden = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', stranger.cookie)
        .send({ title: 'Taken over' })
        .expect(404);
      expect(hidden.body).toEqual(errorBody(404, GROUP_NOT_FOUND_MESSAGE));
    });

    // the group can never be smaller than the number of people inside. the leader counts too.
    it('refuses a size below the active member count', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const member = await registerAndLogin(app, OTHER);
      const third = await registerAndLogin(app, THIRD);
      const group = await createGroup(leader);
      await addMember(group.id, member.id);
      await addMember(group.id, third.id);

      // 3 active people inside, so 2 is too small.
      const tooSmall = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .send({ max_size: 2 })
        .expect(409);
      expect(tooSmall.body).toEqual(errorBody(409, SIZE_BELOW_MEMBERS_MESSAGE));

      // exactly 3 is fine, and then the group is full.
      const full = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .send({ max_size: 3 })
        .expect(200);
      expect(full.body.data).toMatchObject({ max_size: 3, member_count: 3, seats_left: 0 });
    });

    // the location rule looks at the new values together with the old ones.
    it('keeps the location rule when only the mode or only the location changes', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const online = await createGroup(leader);
      const inPerson = await createGroup(leader, { mode: 'in_person', location: 'Library room 2' });

      // an online group with no location cannot switch to in-person alone.
      const switchMode = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${online.id}`)
        .set('Cookie', leader.cookie)
        .send({ mode: 'in_person' })
        .expect(400);
      expect(switchMode.body).toEqual(errorBody(400, LOCATION_REQUIRED_MESSAGE));

      // an in-person group cannot clear its location.
      const clearPlace = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${inPerson.id}`)
        .set('Cookie', leader.cookie)
        .send({ location: null })
        .expect(400);
      expect(clearPlace.body).toEqual(errorBody(400, LOCATION_REQUIRED_MESSAGE));
    });

    // a leader who resends an old exam date that is now in the past is not refused. only a new past date is.
    it('accepts an unchanged past exam date but refuses a new one', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const group = await createGroup(leader);
      // the exam passed: the date is moved into the past straight in the database.
      await prisma.group.update({
        where: { id: group.id },
        data: { examDate: new Date('2000-01-01T00:00:00.000Z') },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .send({ exam_date: '2000-01-01', title: 'Still the same exam' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${group.id}`)
        .set('Cookie', leader.cookie)
        .send({ exam_date: '2000-06-01' })
        .expect(400);
      expect(res.body).toEqual(errorBody(400, EXAM_DATE_IN_PAST_MESSAGE));
    });
  });
});