// imports the type of a built nestjs app, so the variable below has a clear type.
import type { INestApplication } from '@nestjs/common';
// imports supertest. it sends http requests to the app in memory and checks the replies.
import request from 'supertest';
// imports the server type that supertest expects.
import type { App } from 'supertest/types';
// imports the prisma client type, the type tools, and the fixed words the test needs.
// safety: the fixed words come from the generated client and are never typed by hand.
import {
  GroupMemberRole,
  GroupMemberStatus,
  GroupStatus,
  JoinRequestStatus,
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
const LEADER_ONLY_MESSAGE = 'Only the group leader can do this';
const JOIN_REQUEST_NOT_FOUND_MESSAGE = 'This join request does not exist';
const ALREADY_MEMBER_MESSAGE = 'You are already a member of this group';
const GROUP_FULL_MESSAGE = 'This group is full';
const DUPLICATE_PENDING_MESSAGE = 'You already have a pending request for this group';
const REQUEST_ALREADY_ANSWERED_MESSAGE = 'This request has already been answered';
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests. Please try again later';

// the test accounts.
// safety: these are made-up passwords for the empty test database only.
const LEADER = { name: 'Group Leader', email: 'leader@example.com', password: 'correct-horse-9' };
const STUDENT = { name: 'Rafi Student', email: 'student@example.com', password: 'correct-horse-9' };
const MEMBER = { name: 'Group Member', email: 'member@example.com', password: 'correct-horse-9' };
const STRANGER = { name: 'Stranger Student', email: 'stranger@example.com', password: 'correct-horse-9' };
const SECOND = { name: 'Second Student', email: 'second@example.com', password: 'correct-horse-9' };

// the exact keys of the student's view of a request, sorted a to z.
// safety: no reviewed_by, so the student never gets the leader's id from this reply.
const STUDENT_VIEW_KEYS = [
  'created_at',
  'group_id',
  'group_title',
  'id',
  'message',
  'review_note',
  'reviewed_at',
  'status',
];

// the exact keys of the leader's view of a request, sorted a to z.
const LEADER_VIEW_KEYS = ['created_at', 'id', 'message', 'review_note', 'reviewed_at', 'status', 'student'];

// builds the three-key error body, so each check reads in one short line.
function errorBody(statusCode: number, message: string) {
  return { status_code: statusCode, message, errors: [] };
}

// sorts status codes as numbers, smallest first.
// a plain .sort() would compare them as text, which breaks for numbers with a different number of digits.
function sortedStatuses(replies: { status: number }[]): number[] {
  return replies.map((res) => res.status).sort((a, b) => a - b);
}

// these tests check the six join request routes from the outside, the same way the frontend will call them.
describe('join request routes (e2e)', () => {
  // the test database client. it sets up states and reads rows back.
  let prisma: PrismaClient;
  // a fresh app for every test. a fresh app also means fresh rate limit counts.
  let app: INestApplication<App>;
  // an active subject, made fresh for every test.
  let subjectId: number;

  // makes a group and its leader row straight in the test database, and gives back the new group id.
  // "data" changes any field, for example { maxSize: 2 } or { status: GroupStatus.closed }.
  async function seedGroup(
    leaderId: number,
    data: Partial<Prisma.GroupUncheckedCreateInput> = {},
  ): Promise<number> {
    const group = await prisma.group.create({
      data: {
        title: 'Graph Theory Prep',
        subjectId,
        leaderId,
        description: 'Made by the test.',
        mode: Mode.online,
        maxSize: 5,
        ...data,
      },
      select: { id: true },
    });
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: leaderId, role: GroupMemberRole.leader, status: GroupMemberStatus.active },
    });
    return group.id;
  }

  // adds a person to a group straight in the test database, as an active member.
  async function addMember(groupId: number, userId: number) {
    await prisma.groupMember.create({
      data: { groupId, userId, role: GroupMemberRole.member, status: GroupMemberStatus.active },
    });
  }

  // sends a join request through the real route, as the given person.
  function send(account: LoggedInAccount, groupId: number | string, body: object = {}) {
    return request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/join-requests`)
      .set('Cookie', account.cookie)
      .send(body);
  }

  // sends a join request that must succeed, and gives back the new request id.
  async function sendOk(account: LoggedInAccount, groupId: number, body: object = {}): Promise<number> {
    const res = await send(account, groupId, body).expect(201);
    return res.body.data.id as number;
  }

  // calls one of the three action routes (approve, reject, cancel) as the given person.
  function act(account: LoggedInAccount, requestId: number | string, action: string, body: object = {}) {
    return request(app.getHttpServer())
      .post(`/api/v1/join-requests/${requestId}/${action}`)
      .set('Cookie', account.cookie)
      .send(body);
  }

  // runs once before all tests. builds the test database client. the guard runs inside the helper.
  beforeAll(() => {
    prisma = createTestPrisma();
  });

  // runs once after all tests. closes the connection, so jest can exit cleanly.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // runs before each test: empty every table, build a fresh app, and make one active subject.
  beforeEach(async () => {
    await cleanDatabase(prisma);
    app = await createTestApp();
    subjectId = (await prisma.subject.create({ data: { name: 'Data Structures' } })).id;
  });

  // runs after each test. closes the app and its own database connection.
  afterEach(async () => {
    await app.close();
  });

  // safety: all six routes need a login.
  it('gives 401 on all six routes without a cookie', async () => {
    const server = app.getHttpServer();
    const replies = [
      await request(server).post('/api/v1/groups/1/join-requests').send({}),
      await request(server).get('/api/v1/groups/1/join-requests'),
      await request(server).get('/api/v1/users/me/join-requests'),
      await request(server).post('/api/v1/join-requests/1/approve'),
      await request(server).post('/api/v1/join-requests/1/reject').send({ reason: 'No room' }),
      await request(server).post('/api/v1/join-requests/1/cancel'),
    ];
    for (const res of replies) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual(errorBody(401, UNAUTHENTICATED_MESSAGE));
    }
  });

  describe('POST /api/v1/groups/:id/join-requests', () => {
    // the main path: a pending request is saved, the reply has the safe shape, and the leader gets a notification row.
    it('saves a pending request with a safe reply and tells the leader', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);

      const res = await send(student, groupId, { message: '  I need help with trees  ' }).expect(201);

      expect(Object.keys(res.body.data).sort()).toEqual(STUDENT_VIEW_KEYS);
      expect(res.body.data).toMatchObject({
        group_id: groupId,
        group_title: 'Graph Theory Prep',
        status: 'pending',
        message: 'I need help with trees',
        review_note: null,
        reviewed_at: null,
      });

      // the database row: pending, for this student, with the trimmed message.
      const row = await prisma.joinRequest.findUniqueOrThrow({ where: { id: res.body.data.id } });
      expect(row).toMatchObject({ groupId, userId: student.id, status: JoinRequestStatus.pending });

      // the leader's notification row, with the four payload keys.
      const notes = await prisma.notification.findMany({ where: { userId: leader.id } });
      expect(notes).toHaveLength(1);
      expect(notes[0].type).toBe('join_request_received');
      expect(notes[0].payload).toEqual({
        group_id: groupId,
        group_title: 'Graph Theory Prep',
        message: 'Rafi Student asked to join Graph Theory Prep',
        related_id: res.body.data.id,
      });
    });

    // the partial unique index is broken on purpose with a real request.
    // the database refuses it (P2002), and the api answers 409 with the exact message. nothing extra is saved.
    it('refuses a second pending request through the database index with 409', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);

      await sendOk(student, groupId);
      const second = await send(student, groupId, { message: 'Please?' }).expect(409);

      expect(second.body).toEqual(errorBody(409, DUPLICATE_PENDING_MESSAGE));
      expect(await prisma.joinRequest.count()).toBe(1);
      // the failed transaction also rolled back its notification, so the leader has only one.
      expect(await prisma.notification.count({ where: { userId: leader.id } })).toBe(1);
    });

    // two clicks at the same moment: the index lets only one of them through.
    it('lets only one of two requests sent at the same moment through', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);

      const replies = await Promise.all([send(student, groupId), send(student, groupId)]);

      expect(sortedStatuses(replies)).toEqual([201, 409]);
      expect(await prisma.joinRequest.count({ where: { status: JoinRequestStatus.pending } })).toBe(1);
    });

    // a member and the leader are already inside, a full group takes no requests, and a hidden group gives 404.
    it('refuses members, the leader, a full group, and a group that is not open', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const member = await registerAndLogin(app, MEMBER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);
      await addMember(groupId, member.id);

      expect((await send(member, groupId).expect(409)).body).toEqual(errorBody(409, ALREADY_MEMBER_MESSAGE));
      expect((await send(leader, groupId).expect(409)).body).toEqual(errorBody(409, ALREADY_MEMBER_MESSAGE));

      // a group of 2 with the leader and one member is full.
      const fullId = await seedGroup(leader.id, { maxSize: 2 });
      await addMember(fullId, member.id);
      expect((await send(student, fullId).expect(409)).body).toEqual(errorBody(409, GROUP_FULL_MESSAGE));

      // closed, archived, removed, deleted, an unknown id, and a word all give the same 404.
      const closed = await seedGroup(leader.id, { status: GroupStatus.closed });
      const archived = await seedGroup(leader.id, { status: GroupStatus.archived });
      const removed = await seedGroup(leader.id, { status: GroupStatus.removed });
      const deleted = await seedGroup(leader.id, { deletedAt: new Date() });
      for (const id of [closed, archived, removed, deleted, 99999, 'abc']) {
        expect((await send(student, id).expect(404)).body).toEqual(errorBody(404, GROUP_NOT_FOUND_MESSAGE));
      }
      expect(await prisma.joinRequest.count()).toBe(0);
    });

    // safety: the student cannot choose the status, and the message has a length limit.
    it('refuses an unknown field and a message longer than 500 characters', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);

      const status = await send(student, groupId, { status: 'approved' }).expect(400);
      expect(status.body).toEqual({
        status_code: 400,
        message: 'Validation failed',
        errors: [{ field: 'status', message: 'property status should not exist' }],
      });

      const tooLong = await send(student, groupId, { message: 'a'.repeat(501) }).expect(400);
      expect((tooLong.body.errors as { field: string }[]).map((error) => error.field)).toEqual(['message']);
      expect(await prisma.joinRequest.count()).toBe(0);
    });

    // the rate limit: 10 sends per minute from one address. the 11th gets 429 with the plain sentence and Retry-After.
    it('allows 10 sends per minute and refuses the 11th with 429', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);

      // the first send is saved. the next nine are refused as duplicates, but they still count toward the limit.
      await sendOk(student, groupId);
      for (let i = 0; i < 9; i += 1) {
        await send(student, groupId).expect(409);
      }

      const limited = await send(student, groupId).expect(429);
      expect(limited.body).toEqual(errorBody(429, TOO_MANY_REQUESTS_MESSAGE));
      expect(limited.headers['retry-after']).toBeDefined();
    });
  });

  describe('GET /api/v1/groups/:id/join-requests', () => {
    // the leader sees only the pending requests, with the student's safe details and no email.
    it('shows the leader only the pending requests, with no email', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const second = await registerAndLogin(app, SECOND);
      const groupId = await seedGroup(leader.id);
      const pendingId = await sendOk(student, groupId, { message: 'I need help' });
      const cancelledId = await sendOk(second, groupId);
      await act(second, cancelledId, 'cancel').expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/groups/${groupId}/join-requests`)
        .set('Cookie', leader.cookie)
        .expect(200);

      expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 1, total_pages: 1 });
      expect(res.body.data).toHaveLength(1);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(LEADER_VIEW_KEYS);
      expect(res.body.data[0]).toMatchObject({
        id: pendingId,
        status: 'pending',
        message: 'I need help',
        student: { id: student.id, name: STUDENT.name, department: null, academic_year: null },
      });
      // safety: no email of any student is in the reply.
      expect(JSON.stringify(res.body).includes(STUDENT.email)).toBe(false);
    });

    // safety: a member who is not the leader gets 403, and a stranger gets 404.
    it('refuses a member with 403 and a stranger with 404', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const member = await registerAndLogin(app, MEMBER);
      const stranger = await registerAndLogin(app, STRANGER);
      const groupId = await seedGroup(leader.id);
      await addMember(groupId, member.id);

      const asMember = await request(app.getHttpServer())
        .get(`/api/v1/groups/${groupId}/join-requests`)
        .set('Cookie', member.cookie)
        .expect(403);
      expect(asMember.body).toEqual(errorBody(403, LEADER_ONLY_MESSAGE));

      const asStranger = await request(app.getHttpServer())
        .get(`/api/v1/groups/${groupId}/join-requests`)
        .set('Cookie', stranger.cookie)
        .expect(404);
      expect(asStranger.body).toEqual(errorBody(404, GROUP_NOT_FOUND_MESSAGE));
    });
  });

  describe('GET /api/v1/users/me/join-requests', () => {
    // the student sees only their own requests, newest first, and the reason only on a rejected one.
    it('shows only the student own requests, with the reason on a rejected one', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const second = await registerAndLogin(app, SECOND);
      const firstGroup = await seedGroup(leader.id, { title: 'First Group' });
      const secondGroup = await seedGroup(leader.id, { title: 'Second Group' });

      const rejectedId = await sendOk(student, firstGroup);
      await act(leader, rejectedId, 'reject', { reason: 'We meet only in the evening' }).expect(200);
      const pendingId = await sendOk(student, secondGroup);
      // another student's request must never show in this list.
      await sendOk(second, firstGroup);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/join-requests')
        .set('Cookie', student.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(2);
      // newest first: the request to the second group was sent last.
      expect((res.body.data as { id: number }[]).map((item) => item.id)).toEqual([pendingId, rejectedId]);
      expect(res.body.data[1]).toMatchObject({ status: 'rejected', review_note: 'We meet only in the evening' });
      expect(res.body.data[0]).toMatchObject({ status: 'pending', review_note: null });
    });
  });

  describe('POST /api/v1/join-requests/:id/approve', () => {
    // the success case of the transaction: the member row, the request, and the notification are saved together.
    it('adds the member, approves the request, and tells the student', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);
      const requestId = await sendOk(student, groupId);

      const res = await act(leader, requestId, 'approve').expect(200);

      expect(Object.keys(res.body.data).sort()).toEqual(LEADER_VIEW_KEYS);
      expect(res.body.data.status).toBe('approved');

      const member = await prisma.groupMember.findUniqueOrThrow({
        where: { groupId_userId: { groupId, userId: student.id } },
      });
      expect(member).toMatchObject({ role: GroupMemberRole.member, status: GroupMemberStatus.active });

      const row = await prisma.joinRequest.findUniqueOrThrow({ where: { id: requestId } });
      expect(row).toMatchObject({ status: JoinRequestStatus.approved, reviewedBy: leader.id });
      expect(row.reviewedAt).not.toBeNull();

      const notes = await prisma.notification.findMany({ where: { userId: student.id } });
      expect(notes.map((note) => note.type)).toEqual(['join_request_approved']);

      // the group page now counts the new member.
      const page = await request(app.getHttpServer())
        .get(`/api/v1/groups/${groupId}`)
        .set('Cookie', student.cookie)
        .expect(200);
      expect(page.body.data).toMatchObject({ my_role: 'member', member_count: 2, seats_left: 3 });
    });

    // the rollback case: the group filled up after the request was sent. the transaction stops, and nothing changes.
    it('gives 409 for a full group and leaves every row as it was', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const member = await registerAndLogin(app, MEMBER);
      const groupId = await seedGroup(leader.id, { maxSize: 2 });
      const requestId = await sendOk(student, groupId);
      // the last seat is taken after the request was sent.
      await addMember(groupId, member.id);

      const res = await act(leader, requestId, 'approve').expect(409);

      expect(res.body).toEqual(errorBody(409, GROUP_FULL_MESSAGE));
      expect((await prisma.joinRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(
        JoinRequestStatus.pending,
      );
      expect(await prisma.groupMember.count({ where: { groupId } })).toBe(2);
      expect(await prisma.notification.count({ where: { userId: student.id } })).toBe(0);
    });

    // the race for the last seat: two approvals at the same moment. exactly one wins, and the group never goes over its size.
    it('lets only one of two approvals for the last seat win', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const second = await registerAndLogin(app, SECOND);
      const groupId = await seedGroup(leader.id, { maxSize: 2 });
      const firstId = await sendOk(student, groupId);
      const secondId = await sendOk(second, groupId);

      const replies = await Promise.all([act(leader, firstId, 'approve'), act(leader, secondId, 'approve')]);

      expect(sortedStatuses(replies)).toEqual([200, 409]);
      // the loser sees "full" after a retry, or "busy" after the last retry. both are safe answers.
      const loser = replies.find((res) => res.status === 409);
      expect([GROUP_FULL_MESSAGE, 'The server was busy. Please try again']).toContain(loser?.body.message);

      expect(await prisma.groupMember.count({ where: { groupId, status: GroupMemberStatus.active } })).toBe(2);
      expect(await prisma.joinRequest.count({ where: { groupId, status: JoinRequestStatus.approved } })).toBe(1);
    });

    // safety: only the leader may approve. a member gets 403, a stranger gets 404, and nothing changes.
    // an answered request cannot be approved again.
    it('refuses a member, a stranger, and a second approval', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const member = await registerAndLogin(app, MEMBER);
      const stranger = await registerAndLogin(app, STRANGER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);
      await addMember(groupId, member.id);
      const requestId = await sendOk(student, groupId);

      expect((await act(member, requestId, 'approve').expect(403)).body).toEqual(errorBody(403, LEADER_ONLY_MESSAGE));
      expect((await act(stranger, requestId, 'approve').expect(404)).body).toEqual(
        errorBody(404, JOIN_REQUEST_NOT_FOUND_MESSAGE),
      );
      expect((await act(leader, 99999, 'approve').expect(404)).body).toEqual(
        errorBody(404, JOIN_REQUEST_NOT_FOUND_MESSAGE),
      );
      expect((await prisma.joinRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(
        JoinRequestStatus.pending,
      );

      await act(leader, requestId, 'approve').expect(200);
      expect((await act(leader, requestId, 'approve').expect(409)).body).toEqual(
        errorBody(409, REQUEST_ALREADY_ANSWERED_MESSAGE),
      );
    });

    // a removed member may come back only through a new request that the leader approves.
    // the old member row is reused, and the old request stays as history.
    it('lets a removed member rejoin through a new request, reusing the old member row', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);
      const oldJoin = new Date('2026-01-01T00:00:00.000Z');
      // the student was a member before, and the leader removed them.
      const oldRow = await prisma.groupMember.create({
        data: {
          groupId,
          userId: student.id,
          role: GroupMemberRole.member,
          status: GroupMemberStatus.removed,
          joinedAt: oldJoin,
          leftAt: new Date('2026-02-01T00:00:00.000Z'),
          removedBy: leader.id,
        },
      });
      await prisma.joinRequest.create({
        data: { groupId, userId: student.id, status: JoinRequestStatus.approved, reviewedBy: leader.id },
      });

      const requestId = await sendOk(student, groupId, { message: 'May I come back?' });
      await act(leader, requestId, 'approve').expect(200);

      const rows = await prisma.groupMember.findMany({ where: { groupId, userId: student.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: oldRow.id,
        role: GroupMemberRole.member,
        status: GroupMemberStatus.active,
        leftAt: null,
        removedBy: null,
      });
      expect(rows[0].joinedAt.getTime()).toBeGreaterThan(oldJoin.getTime());
      expect(await prisma.joinRequest.count({ where: { groupId, userId: student.id } })).toBe(2);
    });
  });

  describe('POST /api/v1/join-requests/:id/reject', () => {
    // the leader must give a real reason. the reason is saved, and the student is told.
    it('needs a reason, saves it, and tells the student', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);
      const requestId = await sendOk(student, groupId);

      const missing = await act(leader, requestId, 'reject', {}).expect(400);
      expect((missing.body.errors as { field: string }[]).every((error) => error.field === 'reason')).toBe(true);
      const tooShort = await act(leader, requestId, 'reject', { reason: '  no  ' }).expect(400);
      expect(tooShort.body.message).toBe('Validation failed');

      const res = await act(leader, requestId, 'reject', { reason: 'We meet only in the evening' }).expect(200);
      expect(res.body.data).toMatchObject({ status: 'rejected', review_note: 'We meet only in the evening' });

      const row = await prisma.joinRequest.findUniqueOrThrow({ where: { id: requestId } });
      expect(row).toMatchObject({ status: JoinRequestStatus.rejected, reviewNote: 'We meet only in the evening' });
      const notes = await prisma.notification.findMany({ where: { userId: student.id } });
      expect(notes.map((note) => note.type)).toEqual(['join_request_rejected']);
      // a reject never adds a member.
      expect(await prisma.groupMember.count({ where: { groupId } })).toBe(1);
    });

    // safety: only the leader may reject.
    it('refuses a member with 403 and a stranger with 404', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const member = await registerAndLogin(app, MEMBER);
      const stranger = await registerAndLogin(app, STRANGER);
      const student = await registerAndLogin(app, STUDENT);
      const groupId = await seedGroup(leader.id);
      await addMember(groupId, member.id);
      const requestId = await sendOk(student, groupId);

      expect((await act(member, requestId, 'reject', { reason: 'Not my call' }).expect(403)).body).toEqual(
        errorBody(403, LEADER_ONLY_MESSAGE),
      );
      expect((await act(stranger, requestId, 'reject', { reason: 'Not my call' }).expect(404)).body).toEqual(
        errorBody(404, JOIN_REQUEST_NOT_FOUND_MESSAGE),
      );
      expect((await prisma.joinRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(
        JoinRequestStatus.pending,
      );
    });
  });

  describe('POST /api/v1/join-requests/:id/cancel', () => {
    // the student can take back their own pending request, but not someone else's, and not an answered one.
    it('cancels only the student own pending request', async () => {
      const leader = await registerAndLogin(app, LEADER);
      const student = await registerAndLogin(app, STUDENT);
      const stranger = await registerAndLogin(app, STRANGER);
      const groupId = await seedGroup(leader.id);
      const requestId = await sendOk(student, groupId);

      // someone else's request gives the same 404 as an unknown id.
      expect((await act(stranger, requestId, 'cancel').expect(404)).body).toEqual(
        errorBody(404, JOIN_REQUEST_NOT_FOUND_MESSAGE),
      );

      const res = await act(student, requestId, 'cancel').expect(200);
      expect(res.body.data.status).toBe('cancelled');

      // a cancelled request is final.
      expect((await act(student, requestId, 'cancel').expect(409)).body).toEqual(
        errorBody(409, REQUEST_ALREADY_ANSWERED_MESSAGE),
      );
      // after cancelling, the student may ask again, because nothing is pending any more.
      await sendOk(student, groupId);
    });
  });
});