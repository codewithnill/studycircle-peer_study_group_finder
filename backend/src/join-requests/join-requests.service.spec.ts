// imports: the three nestjs errors the service throws, so the tests can check the kind of error.
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
// import: the fixed words from the schema, so the tests never type a status by hand.
import {
  GroupMemberRole,
  GroupMemberStatus,
  GroupStatus,
  JoinRequestStatus,
  Prisma,
  UserStatus,
} from '../generated/prisma/client';
// import: the database connection type and the notification service type. small fakes stand in for both.
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
// import: the real paging helpers. the expected reply is built with them, so the tests do not depend on the meta shape.
import { getPaginationParams, paginated } from '../common/pagination/pagination';
// import: the fixed notification words.
import { NOTIFICATION_TYPES } from '../common/constants/notification-types';
// import: the group messages that the join request routes reuse.
import { GROUP_NOT_FOUND_MESSAGE, LEADER_ONLY_MESSAGE } from '../groups/groups.constants';
// import: the join request messages.
import {
  ALREADY_MEMBER_MESSAGE,
  DUPLICATE_PENDING_MESSAGE,
  GROUP_FULL_MESSAGE,
  JOIN_REQUEST_NOT_FOUND_MESSAGE,
  REQUEST_ALREADY_ANSWERED_MESSAGE,
} from './join-requests.constants';
// import: the service under test.
import { JoinRequestsService } from './join-requests.service';

// the people in the tests. each id plays one role.
const LEADER_ID = 1;
const MEMBER_ID = 3;
const STUDENT_ID = 7;
const STRANGER_ID = 9;

// the group in the tests: open, led by LEADER_ID, with room for 5 people.
const GROUP = { id: 12, title: 'Graph Theory Prep', leaderId: LEADER_ID, status: GroupStatus.active, maxSize: 5 };

// the request in the tests: STUDENT_ID asked to join the group above and is waiting.
const REQUEST = { id: 40, groupId: GROUP.id, userId: STUDENT_ID, status: JoinRequestStatus.pending };

// one fixed time, so the replies are easy to compare.
const CREATED_AT = new Date('2026-11-22T10:00:00.000Z');

// a request row as the student's query gives it back.
const STUDENT_ROW = {
  id: REQUEST.id,
  status: JoinRequestStatus.pending,
  message: 'I need help with trees',
  reviewNote: null as string | null,
  createdAt: CREATED_AT,
  reviewedAt: null as Date | null,
  group: { id: GROUP.id, title: GROUP.title },
};

// a request row as the leader's query gives it back.
const LEADER_ROW = {
  id: REQUEST.id,
  status: JoinRequestStatus.pending,
  message: 'I need help with trees',
  reviewNote: null as string | null,
  createdAt: CREATED_AT,
  reviewedAt: null as Date | null,
  user: { id: STUDENT_ID, name: 'Rafi', department: 'CSE', academicYear: 2 },
};

// the leader's reply shape for LEADER_ROW.
const LEADER_VIEW = {
  id: REQUEST.id,
  status: JoinRequestStatus.pending,
  message: 'I need help with trees',
  reviewNote: null,
  createdAt: CREATED_AT,
  reviewedAt: null,
  student: { id: STUDENT_ID, name: 'Rafi', department: 'CSE', academicYear: 2 },
};

// the student's reply shape for STUDENT_ROW.
const STUDENT_VIEW = {
  id: REQUEST.id,
  groupId: GROUP.id,
  groupTitle: GROUP.title,
  status: JoinRequestStatus.pending,
  message: 'I need help with trees',
  reviewNote: null,
  createdAt: CREATED_AT,
  reviewedAt: null,
};

// builds a fake prisma error with a given code, like "P2002".
function prismaError(code: string): Error {
  const error = new Error('fake prisma error');
  error.name = 'PrismaClientKnownRequestError';
  return Object.assign(error, { code });
}

// checks that a promise fails with the given kind of error and the given message.
async function expectHttpError(
  promise: Promise<unknown>,
  type: new (...args: never[]) => Error,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toThrow(type);
  await expect(promise).rejects.toThrow(message);
}

// "describe" groups the tests for one thing. here: the join requests service.
describe('JoinRequestsService', () => {
  // every fake database function, each kept in its own variable (lint rule "unbound-method").
  let groupFindFirst: jest.Mock;
  let memberFindFirst: jest.Mock;
  let memberCount: jest.Mock;
  let memberUpsert: jest.Mock;
  let requestCreate: jest.Mock;
  let requestFindFirst: jest.Mock;
  let requestFindUnique: jest.Mock;
  let requestFindUniqueOrThrow: jest.Mock;
  let requestUpdate: jest.Mock;
  let requestUpdateMany: jest.Mock;
  let requestCount: jest.Mock;
  let requestFindMany: jest.Mock;
  let userFindUniqueOrThrow: jest.Mock;
  let userFindFirst: jest.Mock;
  let transaction: jest.Mock;
  let notificationsCreate: jest.Mock;
  // the service under test.
  let service: JoinRequestsService;

  // "beforeEach" runs before every test, so each test starts with a fresh, happy-path fake database.
  beforeEach(() => {
    groupFindFirst = jest.fn().mockResolvedValue(GROUP);
    // only the leader and MEMBER_ID are active members. everyone else is outside the group.
    memberFindFirst = jest
      .fn()
      .mockImplementation(({ where }: { where: { userId: number } }) =>
        Promise.resolve(where.userId === LEADER_ID || where.userId === MEMBER_ID ? { id: 100 } : null),
      );
    // 2 active members (the leader and MEMBER_ID), so 3 seats are left.
    memberCount = jest.fn().mockResolvedValue(2);
    memberUpsert = jest.fn().mockResolvedValue({});
    requestCreate = jest.fn().mockResolvedValue({ id: REQUEST.id });
    requestFindFirst = jest.fn().mockResolvedValue({ id: REQUEST.id, status: JoinRequestStatus.pending });
    requestFindUnique = jest.fn().mockResolvedValue(REQUEST);
    // the read after a transaction: the leader's shape has "user", the student's shape has "group".
    requestFindUniqueOrThrow = jest
      .fn()
      .mockImplementation(({ select }: { select: { user?: unknown } }) =>
        Promise.resolve(select.user ? LEADER_ROW : STUDENT_ROW),
      );
    requestUpdate = jest.fn().mockResolvedValue({});
    requestUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    requestCount = jest.fn().mockResolvedValue(1);
    requestFindMany = jest.fn().mockResolvedValue([LEADER_ROW]);
    userFindUniqueOrThrow = jest.fn().mockResolvedValue({ name: 'Rafi' });
    userFindFirst = jest.fn().mockResolvedValue({ id: STUDENT_ID });
    notificationsCreate = jest.fn().mockResolvedValue(undefined);

    // the fake database. the same object also acts as the transaction client.
    const db = {
      group: { findFirst: groupFindFirst },
      groupMember: { findFirst: memberFindFirst, count: memberCount, upsert: memberUpsert },
      joinRequest: {
        create: requestCreate,
        findFirst: requestFindFirst,
        findUnique: requestFindUnique,
        findUniqueOrThrow: requestFindUniqueOrThrow,
        update: requestUpdate,
        updateMany: requestUpdateMany,
        count: requestCount,
        findMany: requestFindMany,
      },
      user: { findUniqueOrThrow: userFindUniqueOrThrow, findFirst: userFindFirst },
      $transaction: undefined as unknown,
    };
    // the fake transaction simply runs the work with the fake database, the way prisma runs it with "tx".
    transaction = jest.fn((work: (tx: unknown) => Promise<unknown>) => work(db));
    db.$transaction = transaction;

    service = new JoinRequestsService(
      db as unknown as PrismaService,
      { create: notificationsCreate } as unknown as NotificationsService,
    );
  });

  describe('sendRequest', () => {
    // the normal case: a pending request is saved, the leader is told, and the student gets the request back.
    it('saves a pending request, tells the leader, and gives back the student view', async () => {
      const result = await service.sendRequest(GROUP.id, STUDENT_ID, { message: 'I need help with trees' });

      expect(result).toEqual(STUDENT_VIEW);
      expect(requestCreate).toHaveBeenCalledWith({
        data: {
          groupId: GROUP.id,
          userId: STUDENT_ID,
          message: 'I need help with trees',
          status: JoinRequestStatus.pending,
        },
        select: { id: true },
      });
      // the notification goes to the leader, inside the transaction (the second argument).
      expect(notificationsCreate).toHaveBeenCalledWith(
        {
          userId: LEADER_ID,
          type: NOTIFICATION_TYPES.JOIN_REQUEST_RECEIVED,
          payload: {
            group_id: GROUP.id,
            group_title: GROUP.title,
            message: 'Rafi asked to join Graph Theory Prep',
            related_id: REQUEST.id,
          },
        },
        expect.anything(),
      );
    });

    // the message is optional. a missing message is saved as null.
    it('saves null when no message is sent', async () => {
      await service.sendRequest(GROUP.id, STUDENT_ID, {});

      expect(requestCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ message: null }) }),
      );
    });

    // only an open group is searched for. a closed, archived, removed, deleted, or unknown group is not found.
    it('gives 404 when the group is not open or does not exist', async () => {
      groupFindFirst.mockResolvedValue(null);

      await expectHttpError(service.sendRequest(GROUP.id, STUDENT_ID, {}), NotFoundException, GROUP_NOT_FOUND_MESSAGE);
      expect(groupFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: GROUP.id, deletedAt: null, status: GroupStatus.active } }),
      );
      expect(requestCreate).not.toHaveBeenCalled();
    });

    // a person who is already inside cannot ask again. the leader counts as a member.
    it('gives 409 to an active member and to the leader', async () => {
      await expectHttpError(service.sendRequest(GROUP.id, MEMBER_ID, {}), ConflictException, ALREADY_MEMBER_MESSAGE);
      await expectHttpError(service.sendRequest(GROUP.id, LEADER_ID, {}), ConflictException, ALREADY_MEMBER_MESSAGE);
      expect(requestCreate).not.toHaveBeenCalled();
    });

    // a full group takes no new requests (decision 4).
    it('gives 409 when the group is full', async () => {
      memberCount.mockResolvedValue(GROUP.maxSize);

      await expectHttpError(service.sendRequest(GROUP.id, STUDENT_ID, {}), ConflictException, GROUP_FULL_MESSAGE);
      expect(requestCreate).not.toHaveBeenCalled();
    });

    // the database refuses a second pending request (P2002). the service gives the exact message (decision 10).
    it('turns P2002 from the pending-request index into 409 with the exact message', async () => {
      requestCreate.mockRejectedValue(prismaError('P2002'));

      await expectHttpError(service.sendRequest(GROUP.id, STUDENT_ID, {}), ConflictException, DUPLICATE_PENDING_MESSAGE);
      expect(notificationsCreate).not.toHaveBeenCalled();
    });

    // any other database error is not hidden. it reaches the shared error filter as it is.
    it('passes any other error on unchanged', async () => {
      const other = prismaError('P2003');
      requestCreate.mockRejectedValue(other);

      await expect(service.sendRequest(GROUP.id, STUDENT_ID, {})).rejects.toBe(other);
    });
  });

  describe('cancelRequest', () => {
    // the normal case: the student's own pending request becomes cancelled.
    it('cancels the student own pending request', async () => {
      const result = await service.cancelRequest(REQUEST.id, STUDENT_ID);

      expect(result).toEqual(STUDENT_VIEW);
      // safety: the change runs only while the request is still pending, and only for this student.
      expect(requestUpdateMany).toHaveBeenCalledWith({
        where: { id: REQUEST.id, userId: STUDENT_ID, status: JoinRequestStatus.pending },
        data: { status: JoinRequestStatus.cancelled },
      });
    });

    // someone else's request, or an unknown id, gives the same 404.
    it('gives 404 for another person request or an unknown id', async () => {
      requestFindFirst.mockResolvedValue(null);

      await expectHttpError(
        service.cancelRequest(REQUEST.id, STRANGER_ID),
        NotFoundException,
        JOIN_REQUEST_NOT_FOUND_MESSAGE,
      );
      expect(requestFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: REQUEST.id, userId: STRANGER_ID } }),
      );
      expect(requestUpdateMany).not.toHaveBeenCalled();
    });

    // a request that is no longer pending (approved, rejected, or cancelled) cannot be cancelled.
    it('gives 409 when the request is no longer pending', async () => {
      requestUpdateMany.mockResolvedValue({ count: 0 });

      await expectHttpError(
        service.cancelRequest(REQUEST.id, STUDENT_ID),
        ConflictException,
        REQUEST_ALREADY_ANSWERED_MESSAGE,
      );
    });
  });

  describe('listMyRequests', () => {
    // the student sees only their own requests, newest first, and the reason only on a rejected one (decision 6).
    it('lists only the student own requests, newest first, with the reason only when rejected', async () => {
      requestFindMany.mockResolvedValue([
        { ...STUDENT_ROW, id: 41, status: JoinRequestStatus.rejected, reviewNote: 'We meet only in the evening' },
        { ...STUDENT_ROW, id: 40, status: JoinRequestStatus.approved, reviewNote: 'an old note' },
      ]);
      requestCount.mockResolvedValue(2);

      const result = await service.listMyRequests(STUDENT_ID, {});

      const params = getPaginationParams({ page: undefined, limit: undefined });
      expect(result).toEqual(
        paginated(
          [
            { ...STUDENT_VIEW, id: 41, status: JoinRequestStatus.rejected, reviewNote: 'We meet only in the evening' },
            { ...STUDENT_VIEW, id: 40, status: JoinRequestStatus.approved, reviewNote: null },
          ],
          params,
          2,
        ),
      );
      expect(requestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: STUDENT_ID },
          orderBy: [{ createdAt: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }],
        }),
      );
    });
  });

  describe('listGroupRequests', () => {
    // the leader sees the pending requests, oldest first, without hidden accounts.
    it('gives the leader the pending requests, oldest first, without suspended or deleted accounts', async () => {
      const result = await service.listGroupRequests(GROUP.id, LEADER_ID, {});

      const params = getPaginationParams({ page: undefined, limit: undefined });
      expect(result).toEqual(paginated([LEADER_VIEW], params, 1));
      expect(requestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            groupId: GROUP.id,
            status: JoinRequestStatus.pending,
            user: { status: UserStatus.active, deletedAt: null },
          },
          orderBy: [{ createdAt: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
        }),
      );
    });

    // a member who is not the leader may see the group, so the answer is 403.
    it('gives 403 to a member who is not the leader', async () => {
      await expectHttpError(service.listGroupRequests(GROUP.id, MEMBER_ID, {}), ForbiddenException, LEADER_ONLY_MESSAGE);
      expect(requestFindMany).not.toHaveBeenCalled();
    });

    // a non-member gets 404, so private group data is never confirmed to strangers.
    it('gives 404 to a non-member', async () => {
      await expectHttpError(
        service.listGroupRequests(GROUP.id, STRANGER_ID, {}),
        NotFoundException,
        GROUP_NOT_FOUND_MESSAGE,
      );
      expect(requestFindMany).not.toHaveBeenCalled();
    });

    // an unknown, removed, or deleted group gives 404.
    it('gives 404 when the group does not exist', async () => {
      groupFindFirst.mockResolvedValue(null);

      await expectHttpError(
        service.listGroupRequests(GROUP.id, LEADER_ID, {}),
        NotFoundException,
        GROUP_NOT_FOUND_MESSAGE,
      );
    });
  });

  describe('approveRequest', () => {
    // the normal case: one serializable transaction adds the member, updates the request, and tells the student.
    it('adds the member, approves the request, and tells the student, in one serializable transaction', async () => {
      const result = await service.approveRequest(REQUEST.id, LEADER_ID);

      expect(result).toEqual(LEADER_VIEW);
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      // a returning member gets the old row back: active, a normal member, and the old leave details cleared (decision 9).
      expect(memberUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId_userId: { groupId: GROUP.id, userId: STUDENT_ID } },
          update: expect.objectContaining({
            role: GroupMemberRole.member,
            status: GroupMemberStatus.active,
            joinedAt: expect.any(Date),
            leftAt: null,
            removedBy: null,
          }),
        }),
      );
      expect(requestUpdate).toHaveBeenCalledWith({
        where: { id: REQUEST.id },
        data: { status: JoinRequestStatus.approved, reviewedBy: LEADER_ID, reviewedAt: expect.any(Date) },
      });
      expect(notificationsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: STUDENT_ID, type: NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED }),
        expect.anything(),
      );
    });

    // the rollback case: a full group stops the transaction before anything is saved.
    it('gives 409 for a full group and saves nothing', async () => {
      memberCount.mockResolvedValue(GROUP.maxSize);

      await expectHttpError(service.approveRequest(REQUEST.id, LEADER_ID), ConflictException, GROUP_FULL_MESSAGE);
      expect(memberUpsert).not.toHaveBeenCalled();
      expect(requestUpdate).not.toHaveBeenCalled();
      expect(notificationsCreate).not.toHaveBeenCalled();
    });

    // a group that is not open (for example closed) takes no new members.
    it('gives 409 when the group is not open', async () => {
      groupFindFirst.mockResolvedValue({ ...GROUP, status: GroupStatus.closed });

      await expectHttpError(service.approveRequest(REQUEST.id, LEADER_ID), ConflictException, GROUP_FULL_MESSAGE);
      expect(memberUpsert).not.toHaveBeenCalled();
    });

    // a member gets 403, and a stranger gets the request's 404 (decision 7).
    it('gives 403 to a member who is not the leader and 404 to a non-member', async () => {
      await expectHttpError(service.approveRequest(REQUEST.id, MEMBER_ID), ForbiddenException, LEADER_ONLY_MESSAGE);
      await expectHttpError(
        service.approveRequest(REQUEST.id, STRANGER_ID),
        NotFoundException,
        JOIN_REQUEST_NOT_FOUND_MESSAGE,
      );
      expect(memberUpsert).not.toHaveBeenCalled();
    });

    // an unknown request id gives 404.
    it('gives 404 for an unknown request', async () => {
      requestFindUnique.mockResolvedValue(null);

      await expectHttpError(
        service.approveRequest(REQUEST.id, LEADER_ID),
        NotFoundException,
        JOIN_REQUEST_NOT_FOUND_MESSAGE,
      );
    });

    // only "pending" can change. an approved, rejected, or cancelled request is final.
    it('gives 409 when the request is no longer pending', async () => {
      requestFindUnique.mockResolvedValue({ ...REQUEST, status: JoinRequestStatus.cancelled });

      await expectHttpError(
        service.approveRequest(REQUEST.id, LEADER_ID),
        ConflictException,
        REQUEST_ALREADY_ANSWERED_MESSAGE,
      );
      expect(memberUpsert).not.toHaveBeenCalled();
    });

    // a suspended or deleted student stays hidden, so the request acts as if it does not exist.
    it('gives 404 when the student account is suspended or deleted', async () => {
      userFindFirst.mockResolvedValue(null);

      await expectHttpError(
        service.approveRequest(REQUEST.id, LEADER_ID),
        NotFoundException,
        JOIN_REQUEST_NOT_FOUND_MESSAGE,
      );
      expect(memberUpsert).not.toHaveBeenCalled();
    });
  });

  describe('rejectRequest', () => {
    // the normal case: the reason is saved, and the student is told with the reason.
    it('saves the reason and tells the student, in one serializable transaction', async () => {
      const result = await service.rejectRequest(REQUEST.id, LEADER_ID, { reason: 'We meet only in the evening' });

      expect(result).toEqual(LEADER_VIEW);
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(requestUpdate).toHaveBeenCalledWith({
        where: { id: REQUEST.id },
        data: {
          status: JoinRequestStatus.rejected,
          reviewedBy: LEADER_ID,
          reviewNote: 'We meet only in the evening',
          reviewedAt: expect.any(Date),
        },
      });
      expect(notificationsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: STUDENT_ID,
          type: NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED,
          payload: expect.objectContaining({
            message: 'Your request to join Graph Theory Prep was not accepted. Reason: We meet only in the evening',
          }),
        }),
        expect.anything(),
      );
      // a reject never adds a member.
      expect(memberUpsert).not.toHaveBeenCalled();
    });

    // a member gets 403, and a stranger gets 404.
    it('gives 403 to a member who is not the leader and 404 to a non-member', async () => {
      await expectHttpError(
        service.rejectRequest(REQUEST.id, MEMBER_ID, { reason: 'Not for me to decide' }),
        ForbiddenException,
        LEADER_ONLY_MESSAGE,
      );
      await expectHttpError(
        service.rejectRequest(REQUEST.id, STRANGER_ID, { reason: 'Not for me to decide' }),
        NotFoundException,
        JOIN_REQUEST_NOT_FOUND_MESSAGE,
      );
      expect(requestUpdate).not.toHaveBeenCalled();
    });

    // only "pending" can change.
    it('gives 409 when the request is no longer pending', async () => {
      requestFindUnique.mockResolvedValue({ ...REQUEST, status: JoinRequestStatus.approved });

      await expectHttpError(
        service.rejectRequest(REQUEST.id, LEADER_ID, { reason: 'Too late now' }),
        ConflictException,
        REQUEST_ALREADY_ANSWERED_MESSAGE,
      );
      expect(requestUpdate).not.toHaveBeenCalled();
    });
  });
});