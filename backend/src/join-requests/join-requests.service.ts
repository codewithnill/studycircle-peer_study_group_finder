// imports: "Injectable" marks a class so nestjs can create it and hand it to other classes.
// the three exceptions are the errors this service throws: 409, 403, and 404.
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// import: prismaservice is the one shared database connection. nestjs hands it in.
import { PrismaService } from '../prisma/prisma.service';
// import: "Prisma" gives the type tools and the sort words. the other four hold the fixed words from the schema.
// safety: the fixed words come from the generated client and are never typed by hand, so a typo cannot create a wrong status.
import {
  GroupMemberRole,
  GroupMemberStatus,
  GroupStatus,
  JoinRequestStatus,
  Prisma,
  UserStatus,
} from '../generated/prisma/client';
// import: the shared retry helper. it runs a transaction at the serializable level and tries again after a collision.
import { runSerializable } from '../common/database/run-serializable';
// import: the paging helper and the shared page query shape.
import { getPaginationParams, paginated, PaginatedResult } from '../common/pagination/pagination';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
// import: the fixed notification words, so they are never typed by hand.
import { NOTIFICATION_TYPES } from '../common/constants/notification-types';
// import: the service that saves notifications inside the same transaction as the action.
import { NotificationsService } from '../notifications/notifications.service';
// import: two group messages that already exist. they are imported, never typed a second time.
import { GROUP_NOT_FOUND_MESSAGE, LEADER_ONLY_MESSAGE } from '../groups/groups.constants';
// import: the two input shapes. the validation pipe has already checked each field when they arrive here.
import { RejectJoinRequestDto } from './dto/reject-join-request.dto';
import { SendJoinRequestDto } from './dto/send-join-request.dto';
// import: the join request messages.
import {
  ALREADY_MEMBER_MESSAGE,
  DUPLICATE_PENDING_MESSAGE,
  GROUP_FULL_MESSAGE,
  JOIN_REQUEST_NOT_FOUND_MESSAGE,
  REQUEST_ALREADY_ANSWERED_MESSAGE,
} from './join-requests.constants';

// the fields a student sees about their own request (decision 6).
// safety: reviewed_by (the leader's id) is left out. the student already knows the leader from the group page.
const STUDENT_VIEW_SELECT = {
  id: true,
  status: true,
  message: true,
  reviewNote: true,
  createdAt: true,
  reviewedAt: true,
  group: { select: { id: true, title: true } },
} satisfies Prisma.JoinRequestSelect;

// the fields the leader sees about a request in the group's list.
// safety: only the student's id, name, department, and year, the same as the public profile. never the email.
const LEADER_VIEW_SELECT = {
  id: true,
  status: true,
  message: true,
  reviewNote: true,
  createdAt: true,
  reviewedAt: true,
  user: { select: { id: true, name: true, department: true, academicYear: true } },
} satisfies Prisma.JoinRequestSelect;

// the types of one row from each query above. they are built from the selects, so the two can never disagree.
type StudentViewRow = Prisma.JoinRequestGetPayload<{ select: typeof STUDENT_VIEW_SELECT }>;
type LeaderViewRow = Prisma.JoinRequestGetPayload<{ select: typeof LEADER_VIEW_SELECT }>;

// the reply shape for the student. the response interceptor changes the keys to snake_case (groupTitle becomes group_title).
export interface StudentJoinRequestView {
  id: number;
  groupId: number;
  groupTitle: string;
  status: JoinRequestStatus;
  message: string | null;
  // the leader's reason. filled only when the request was rejected, otherwise null.
  reviewNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}

// the reply shape for the leader.
export interface LeaderJoinRequestView {
  id: number;
  status: JoinRequestStatus;
  message: string | null;
  reviewNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  student: {
    id: number;
    name: string;
    department: string | null;
    academicYear: number | null;
  };
}

// the small part of a group that the leader checks need. only plain columns, no linked tables.
// note: inside a transaction, only plain columns are read. a query with linked fields inside a transaction
// made the pg driver print a warning in week 4, so the full reply is read after the transaction ends.
const GROUP_CHECK_SELECT = {
  id: true,
  title: true,
  leaderId: true,
  status: true,
  maxSize: true,
} satisfies Prisma.GroupSelect;

type GroupCheckRow = Prisma.GroupGetPayload<{ select: typeof GROUP_CHECK_SELECT }>;

// the small part of a request that the leader checks need.
const REQUEST_CHECK_SELECT = {
  id: true,
  groupId: true,
  userId: true,
  status: true,
} satisfies Prisma.JoinRequestSelect;

type RequestCheckRow = Prisma.JoinRequestGetPayload<{ select: typeof REQUEST_CHECK_SELECT }>;

// checks whether an error is a known prisma error with a given code, like "P2002".
// the error's name is checked, the same way the shared error filter and the retry helper do it.
function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    error.name === 'PrismaClientKnownRequestError' &&
    (error as { code?: unknown }).code === code
  );
}

// turns a database row into the student's reply shape.
// every field is written out by hand, so a field added to the query later never reaches the reply by accident.
function toStudentView(row: StudentViewRow): StudentJoinRequestView {
  return {
    id: row.id,
    groupId: row.group.id,
    groupTitle: row.group.title,
    status: row.status,
    message: row.message,
    // the reason is shown only for a rejected request (decision 6).
    reviewNote: row.status === JoinRequestStatus.rejected ? row.reviewNote : null,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
  };
}

// turns a database row into the leader's reply shape. every field is written out by hand, for the same reason.
function toLeaderView(row: LeaderViewRow): LeaderJoinRequestView {
  return {
    id: row.id,
    status: row.status,
    message: row.message,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    student: {
      id: row.user.id,
      name: row.user.name,
      department: row.user.department,
      academicYear: row.user.academicYear,
    },
  };
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// the join requests service. it owns sending, cancelling, listing, approving, and rejecting join requests.
// every rule lives here, and the controller stays thin.
export class JoinRequestsService {
  // the constructor receives the database connection and the notification service from nestjs.
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // a student asks to join a group. gives back the new request in the student's shape.
  // safety: the student id comes from the login cookie, never from the body.
  async sendRequest(
    groupId: number,
    userId: number,
    dto: SendJoinRequestDto,
  ): Promise<StudentJoinRequestView> {
    let requestId: number;

    try {
      // one transaction: the checks, the request row, and the leader's notification succeed together, or none of them happen.
      requestId = await this.prisma.$transaction(async (tx) => {
        // only an open group takes requests. closed, archived, removed, deleted, and unknown groups all give the same 404 (decision 5).
        const group = await tx.group.findFirst({
          where: { id: groupId, deletedAt: null, status: GroupStatus.active },
          select: GROUP_CHECK_SELECT,
        });
        if (!group) {
          throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
        }

        // a person who is already inside cannot ask again. the leader counts as a member too.
        // a person who left, or was removed, has a row with another status, so they may ask again (decided 13 november).
        if (await this.findActiveMembership(tx, groupId, userId)) {
          throw new ConflictException(ALREADY_MEMBER_MESSAGE);
        }

        // a full group takes no new requests (decision 4). approve checks the count again later, inside its own transaction.
        const activeMembers = await this.countActiveMembers(tx, groupId);
        if (activeMembers >= group.maxSize) {
          throw new ConflictException(GROUP_FULL_MESSAGE);
        }

        // the new request. there is no "already pending?" check first, on purpose (decision 10).
        // the partial unique index in the database refuses a second pending request, even when two clicks arrive at once.
        const request = await tx.joinRequest.create({
          data: {
            groupId,
            userId,
            message: dto.message ?? null,
            status: JoinRequestStatus.pending,
          },
          select: { id: true },
        });

        // the student's name, for the leader's bell message.
        const student = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { name: true },
        });

        // the leader learns about the new request. saved in the same transaction, so it never points to a request that failed.
        await this.notifications.create(
          {
            userId: group.leaderId,
            type: NOTIFICATION_TYPES.JOIN_REQUEST_RECEIVED,
            payload: {
              group_id: group.id,
              group_title: group.title,
              message: `${student.name} asked to join ${group.title}`,
              related_id: request.id,
            },
          },
          tx,
        );

        return request.id;
      });
    } catch (error) {
      // the database refused a second pending request (P2002 from the partial unique index).
      // the shared filter would say "This value is already in use", so the exact message is given here.
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(DUPLICATE_PENDING_MESSAGE);
      }
      throw error;
    }

    // read the finished request back in the student's shape, after the transaction.
    return this.readStudentView(requestId);
  }

  // the student takes back their own pending request. gives back the request in the student's shape.
  async cancelRequest(requestId: number, userId: number): Promise<StudentJoinRequestView> {
    // safety: the request is searched by its id and the student id together.
    // someone else's request gives the same 404 as an unknown id, so nobody can find requests by guessing.
    const request = await this.prisma.joinRequest.findFirst({
      where: { id: requestId, userId },
      select: { id: true, status: true },
    });
    if (!request) {
      throw new NotFoundException(JOIN_REQUEST_NOT_FOUND_MESSAGE);
    }

    // "updateMany" with the status in the filter changes the row only if it is still pending at this moment.
    // if the leader approved it a split second earlier, nothing is changed, and the count is 0.
    // this needs no transaction, because the check and the change happen in one database command.
    const result = await this.prisma.joinRequest.updateMany({
      where: { id: requestId, userId, status: JoinRequestStatus.pending },
      data: { status: JoinRequestStatus.cancelled },
    });
    if (result.count === 0) {
      throw new ConflictException(REQUEST_ALREADY_ANSWERED_MESSAGE);
    }

    return this.readStudentView(requestId);
  }

  // gives the logged-in student one page of their own requests, newest first.
  async listMyRequests(
    userId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StudentJoinRequestView>> {
    // the paging numbers. a bad or missing "page" or "limit" is fixed here, never refused.
    const params = getPaginationParams({ page: query.page, limit: query.limit });
    // safety: only this person's own requests. the id comes from the login cookie.
    const where: Prisma.JoinRequestWhereInput = { userId };

    // the count and the page, read at the same time. the id breaks ties, so paging never repeats or skips a request.
    const [total, rows] = await Promise.all([
      this.prisma.joinRequest.count({ where }),
      this.prisma.joinRequest.findMany({
        where,
        orderBy: [{ createdAt: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }],
        skip: params.skip,
        take: params.take,
        select: STUDENT_VIEW_SELECT,
      }),
    ]);

    return paginated(rows.map(toStudentView), params, total);
  }

  // gives the leader one page of the group's pending requests, oldest first, so the first person to ask is seen first.
  async listGroupRequests(
    groupId: number,
    userId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<LeaderJoinRequestView>> {
    // only the leader may see the list. a non-member gets 404, a member who is not the leader gets 403 (decision 7).
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, deletedAt: null, status: { not: GroupStatus.removed } },
      select: GROUP_CHECK_SELECT,
    });
    if (!group) {
      throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
    }
    await this.assertLeader(this.prisma, group, userId, GROUP_NOT_FOUND_MESSAGE);

    const params = getPaginationParams({ page: query.page, limit: query.limit });
    // only pending requests, and never one from a suspended or deleted account.
    // safety: a hidden account stays hidden from every view (api shape rules, section 7).
    const where: Prisma.JoinRequestWhereInput = {
      groupId,
      status: JoinRequestStatus.pending,
      user: { status: UserStatus.active, deletedAt: null },
    };

    const [total, rows] = await Promise.all([
      this.prisma.joinRequest.count({ where }),
      this.prisma.joinRequest.findMany({
        where,
        orderBy: [{ createdAt: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
        skip: params.skip,
        take: params.take,
        select: LEADER_VIEW_SELECT,
      }),
    ]);

    return paginated(rows.map(toLeaderView), params, total);
  }

  // the leader accepts a request. the student becomes an active member. gives back the request in the leader's shape.
  // this is the multi-table transaction the course asks for: count, check the size, add the member, update the request,
  // and save the notification. either all of it happens, or none of it does.
  async approveRequest(requestId: number, userId: number): Promise<LeaderJoinRequestView> {
    // the serializable level with retry (decision 11). two approvals for the last seat cannot both win.
    await runSerializable(this.prisma, async (tx) => {
      // the request and its group, with the leader check.
      const { request, group } = await this.loadRequestForLeader(tx, requestId, userId);

      // the student's account must still be active. a suspended or deleted account stays hidden, so it gives 404.
      const student = await tx.user.findFirst({
        where: { id: request.userId, status: UserStatus.active, deletedAt: null },
        select: { id: true },
      });
      if (!student) {
        throw new NotFoundException(JOIN_REQUEST_NOT_FOUND_MESSAGE);
      }

      // only an open group takes new members. a closed group keeps its requests, but nobody new comes in.
      if (group.status !== GroupStatus.active) {
        throw new ConflictException(GROUP_FULL_MESSAGE);
      }

      // the count is read inside the transaction, so it is the real count at this moment.
      // safety: if the group is full, the error stops the transaction, and nothing is saved (the rollback).
      const activeMembers = await this.countActiveMembers(tx, group.id);
      if (activeMembers >= group.maxSize) {
        throw new ConflictException(GROUP_FULL_MESSAGE);
      }

      // the time of the approval. the same time is used for the member row and the request.
      const now = new Date();

      // the member row. one row per person per group (fixed values file, A6, rule 1).
      // "upsert" means "update the row if it exists, otherwise create it".
      // a person who left or was removed gets their old row back as a normal active member (decision 9).
      // "joinedAt: now" puts a person who rejoins at the back of the line for auto-promote.
      await tx.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: request.userId } },
        create: {
          groupId: group.id,
          userId: request.userId,
          role: GroupMemberRole.member,
          status: GroupMemberStatus.active,
          joinedAt: now,
        },
        update: {
          role: GroupMemberRole.member,
          status: GroupMemberStatus.active,
          joinedAt: now,
          leftAt: null,
          removedBy: null,
        },
      });

      // the request becomes final. reviewed_by and reviewed_at feed the "reply within 24 hours" number later.
      await tx.joinRequest.update({
        where: { id: request.id },
        data: { status: JoinRequestStatus.approved, reviewedBy: userId, reviewedAt: now },
      });

      // the student learns the good news, inside the same transaction.
      await this.notifications.create(
        {
          userId: request.userId,
          type: NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED,
          payload: {
            group_id: group.id,
            group_title: group.title,
            message: `Your request to join ${group.title} was approved`,
            related_id: request.id,
          },
        },
        tx,
      );
    });

    // read the finished request back in the leader's shape, after the transaction.
    return this.readLeaderView(requestId);
  }

  // the leader refuses a request with a reason. gives back the request in the leader's shape.
  async rejectRequest(
    requestId: number,
    userId: number,
    dto: RejectJoinRequestDto,
  ): Promise<LeaderJoinRequestView> {
    // the serializable level here too, so an approve and a reject of the same request at once cannot both win.
    await runSerializable(this.prisma, async (tx) => {
      const { request, group } = await this.loadRequestForLeader(tx, requestId, userId);

      // the reason is saved in the review_note column. it keeps the student from feeling ignored.
      await tx.joinRequest.update({
        where: { id: request.id },
        data: {
          status: JoinRequestStatus.rejected,
          reviewedBy: userId,
          reviewNote: dto.reason,
          reviewedAt: new Date(),
        },
      });

      // the student learns the answer and the reason (fixed values file, B1).
      await this.notifications.create(
        {
          userId: request.userId,
          type: NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED,
          payload: {
            group_id: group.id,
            group_title: group.title,
            message: `Your request to join ${group.title} was not accepted. Reason: ${dto.reason}`,
            related_id: request.id,
          },
        },
        tx,
      );
    });

    return this.readLeaderView(requestId);
  }

  // finds a request and its group for a leader action (approve or reject), and checks every access rule.
  // safety: every hidden case gives the request's 404, so a stranger cannot learn that a request id exists.
  private async loadRequestForLeader(
    tx: Prisma.TransactionClient,
    requestId: number,
    userId: number,
  ): Promise<{ request: RequestCheckRow; group: GroupCheckRow }> {
    const request = await tx.joinRequest.findUnique({
      where: { id: requestId },
      select: REQUEST_CHECK_SELECT,
    });
    if (!request) {
      throw new NotFoundException(JOIN_REQUEST_NOT_FOUND_MESSAGE);
    }

    // a removed or deleted group acts as if it does not exist.
    const group = await tx.group.findFirst({
      where: { id: request.groupId, deletedAt: null, status: { not: GroupStatus.removed } },
      select: GROUP_CHECK_SELECT,
    });
    if (!group) {
      throw new NotFoundException(JOIN_REQUEST_NOT_FOUND_MESSAGE);
    }

    // only the leader may answer. a member gets 403, a stranger gets 404 (decision 7).
    await this.assertLeader(tx, group, userId, JOIN_REQUEST_NOT_FOUND_MESSAGE);

    // only "pending" can change. the other three statuses are final (fixed values file, A7, rule 1).
    if (request.status !== JoinRequestStatus.pending) {
      throw new ConflictException(REQUEST_ALREADY_ANSWERED_MESSAGE);
    }

    return { request, group };
  }

  // refuses everyone except the group's leader.
  // a member who is not the leader may see the group, so the honest answer is 403.
  // a stranger gets 404 with the given message, because private group data is never confirmed to strangers.
  // safety: the leader is read from the database, never from the request.
  private async assertLeader(
    client: Prisma.TransactionClient,
    group: GroupCheckRow,
    userId: number,
    notFoundMessage: string,
  ): Promise<void> {
    if (group.leaderId === userId) {
      return;
    }
    if (await this.findActiveMembership(client, group.id, userId)) {
      throw new ForbiddenException(LEADER_ONLY_MESSAGE);
    }
    throw new NotFoundException(notFoundMessage);
  }

  // finds the person's active membership in a group, or null.
  private findActiveMembership(client: Prisma.TransactionClient, groupId: number, userId: number) {
    return client.groupMember.findFirst({
      where: { groupId, userId, status: GroupMemberStatus.active },
      select: { id: true },
    });
  }

  // counts the active members of a group. the leader counts as a member.
  private countActiveMembers(client: Prisma.TransactionClient, groupId: number): Promise<number> {
    return client.groupMember.count({ where: { groupId, status: GroupMemberStatus.active } });
  }

  // reads one request in the student's shape, after a transaction has finished.
  private async readStudentView(requestId: number): Promise<StudentJoinRequestView> {
    const row = await this.prisma.joinRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: STUDENT_VIEW_SELECT,
    });
    return toStudentView(row);
  }

  // reads one request in the leader's shape, after a transaction has finished.
  private async readLeaderView(requestId: number): Promise<LeaderJoinRequestView> {
    const row = await this.prisma.joinRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: LEADER_VIEW_SELECT,
    });
    return toLeaderView(row);
  }
}