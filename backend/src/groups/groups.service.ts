// imports: "Injectable" marks a class so nestjs can create it and hand it to other classes.
// the four exceptions are the errors this service throws: 400, 409, 403, and 404.
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// import: prismaservice is the one shared database connection. nestjs hands it in.
import { PrismaService } from '../prisma/prisma.service';
// import: "Prisma" gives the type tools and the transaction levels.
// the other four hold the fixed words from the schema.
// safety: the fixed words come from the generated client and are never typed by hand, so a typo cannot create a wrong status.
import {
  GroupMemberRole,
  GroupMemberStatus,
  GroupStatus,
  Mode,
  Prisma,
} from '../generated/prisma/client';
// import: two messages that already exist in the users module. they are imported, never typed a second time.
import { NOTHING_TO_UPDATE_MESSAGE, SUBJECT_NOT_FOUND_MESSAGE } from '../users/users.constants';
// import: the two input shapes. the validation pipe has already checked each field when they arrive here.
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
// import: the group messages.
import {
  EXAM_DATE_IN_PAST_MESSAGE,
  GROUP_NOT_FOUND_MESSAGE,
  LEADER_ONLY_MESSAGE,
  LEVEL_NOT_FOUND_MESSAGE,
  LOCATION_REQUIRED_MESSAGE,
  SIZE_BELOW_MEMBERS_MESSAGE,
} from './groups.constants';

// the fields of a group page, as one database query.
// safety: is_flagged, institution_id, deleted_at, and the leader's email are left out. a new field must be added here by hand.
// "_count" asks the database to count the active members, so "seats left" is worked out and never stored.
export const GROUP_DETAILS_SELECT = {
  id: true,
  title: true,
  topic: true,
  description: true,
  examDate: true,
  mode: true,
  location: true,
  maxSize: true,
  status: true,
  membersCanPost: true,
  createdAt: true,
  subject: { select: { id: true, name: true } },
  level: { select: { id: true, name: true } },
  // safety: only the leader's id and name. the email is never sent to other people.
  leader: { select: { id: true, name: true } },
  _count: { select: { members: { where: { status: GroupMemberStatus.active } } } },
} satisfies Prisma.GroupSelect;

// the type of one row from the query above. it is built from the select, so the two can never disagree.
type GroupDetailsRow = Prisma.GroupGetPayload<{ select: typeof GROUP_DETAILS_SELECT }>;

// a small { id, name } pair, used for the subject, the level, and the leader.
export interface IdName {
  id: number;
  name: string;
}

// the reply shape of a group page. the response interceptor changes the keys to snake_case (seatsLeft becomes seats_left).
export interface GroupDetails {
  id: number;
  title: string;
  topic: string | null;
  description: string;
  // the exam date as "YYYY-MM-DD", or null. it is sent as plain text, so no time zone can shift the day.
  examDate: string | null;
  mode: Mode;
  location: string | null;
  maxSize: number;
  // how many active members the group has, counting the leader.
  memberCount: number;
  // how many more people can join. never below 0.
  seatsLeft: number;
  status: GroupStatus;
  membersCanPost: boolean;
  createdAt: Date;
  subject: IdName;
  level: IdName | null;
  leader: IdName;
  // the role of the person who asked: "leader", "member", or null for someone who is not inside.
  // the frontend uses it to show an "Edit" button or a "Join" button.
  myRole: GroupMemberRole | null;
}

// turns a "YYYY-MM-DD" text into a date at midnight utc. the exam_date column keeps only the day.
function fromDateOnly(text: string): Date {
  return new Date(`${text}T00:00:00.000Z`);
}

// turns a stored day back into "YYYY-MM-DD" text, or null when there is no date.
// toISOString() gives text like "2026-12-15T00:00:00.000Z". the first 10 characters are the day.
function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

// gives today's date as "YYYY-MM-DD" by the server clock (utc).
// late at night in bangladesh (utc+6), utc can still be yesterday, so the check is a little kind and never unfair.
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// turns a database row and the viewer's role into the reply shape.
// every field is written out by hand, so a field added to the query later never reaches the reply by accident.
function toGroupDetails(row: GroupDetailsRow, myRole: GroupMemberRole | null): GroupDetails {
  const memberCount = row._count.members;
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    description: row.description,
    examDate: toDateOnly(row.examDate),
    mode: row.mode,
    location: row.location,
    maxSize: row.maxSize,
    memberCount,
    // Math.max keeps it at 0 even if the numbers were ever out of step.
    seatsLeft: Math.max(0, row.maxSize - memberCount),
    status: row.status,
    membersCanPost: row.membersCanPost,
    createdAt: row.createdAt,
    subject: row.subject,
    level: row.level,
    leader: row.leader,
    myRole,
  };
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// this service owns creating, reading, and editing groups.
// join requests, leaving, and handing over leadership come in week 5.
export class GroupsService {
  // the constructor receives the database connection. "private" also saves it as this.prisma.
  constructor(private readonly prisma: PrismaService) {}

  // creates a group with the logged-in person as its leader, and gives back the new group page.
  // safety: the leader id comes from the login cookie, never from the body.
  async createGroup(leaderId: number, dto: CreateGroupDto): Promise<GroupDetails> {
    // missing optional fields become null, so the database always gets a clear value.
    const location = dto.location ?? null;
    const examDate = dto.examDate ?? null;

    // the two rules that the dto cannot check alone. they run before any database work.
    this.assertLocationRule(dto.mode, location);
    if (examDate !== null) {
      this.assertExamDateNotPast(examDate);
    }

    // one transaction: the checks, the group row, and the leader's member row succeed together, or none of them happen.
    // this keeps the rule "every group has exactly one active leader" true from the very first moment.
    const groupId = await this.prisma.$transaction(async (tx) => {
      // the subject must exist and be active. the level is optional, but if it is given it must be active too.
      await this.assertActiveSubject(tx, dto.subjectId);
      if (dto.levelId != null) {
        await this.assertActiveLevel(tx, dto.levelId);
      }

      // the group row. each field is copied one by one, so the dto is never spread into the query.
      const group = await tx.group.create({
        data: {
          title: dto.title,
          subjectId: dto.subjectId,
          levelId: dto.levelId ?? null,
          leaderId,
          topic: dto.topic ?? null,
          description: dto.description,
          examDate: examDate === null ? null : fromDateOnly(examDate),
          mode: dto.mode,
          location,
          maxSize: dto.maxSize,
          membersCanPost: dto.membersCanPost ?? false,
        },
        select: { id: true },
      });

      // the leader's own member row, so chat, files, and member checks can use one table.
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: leaderId,
          role: GroupMemberRole.leader,
          status: GroupMemberStatus.active,
        },
      });

      return group.id;
    });

    // read the finished group back in the reply shape.
    return this.getGroup(groupId, leaderId);
  }

  // gives one group page to a logged-in person.
  // safety: a removed or deleted group, an archived group for a non-member, and an unknown id
  // all give the same 404, so nobody can tell a hidden group from a missing one.
  async getGroup(groupId: number, viewerId: number): Promise<GroupDetails> {
    // live groups only, and never a group that an admin removed.
    const row = await this.prisma.group.findFirst({
      where: { id: groupId, deletedAt: null, status: { not: GroupStatus.removed } },
      select: GROUP_DETAILS_SELECT,
    });
    if (!row) {
      throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
    }

    // the viewer's own active membership, if there is one.
    const membership = await this.findActiveMembership(groupId, viewerId);

    // an archived group is kept for history. only its members may still open it.
    if (row.status === GroupStatus.archived && !membership) {
      throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
    }

    return toGroupDetails(row, membership?.role ?? null);
  }

  // changes a group's details. only the leader may do this. gives back the new group page.
  // a missing field is not changed. null clears a field that may be empty.
  async updateGroup(groupId: number, userId: number, dto: UpdateGroupDto): Promise<GroupDetails> {
    // the allowed fields are copied one by one. the dto is never spread into the query.
    // prisma skips a field whose value is undefined, so "missing" means "do not change".
    const data: Prisma.GroupUncheckedUpdateInput = {
      title: dto.title,
      subjectId: dto.subjectId,
      levelId: dto.levelId,
      topic: dto.topic,
      description: dto.description,
      examDate:
        dto.examDate === undefined ? undefined : dto.examDate === null ? null : fromDateOnly(dto.examDate),
      mode: dto.mode,
      location: dto.location,
      maxSize: dto.maxSize,
      membersCanPost: dto.membersCanPost,
    };

    // an empty body changes nothing. it is most likely a mistake in the form, so it gives a clear 400 error.
    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException(NOTHING_TO_UPDATE_MESSAGE);
    }

    // one transaction at the serializable level. it makes postgres act as if two transactions ran one after the other.
    // later, a join approval and a size change at the same moment cannot push the group over its size.
    // if two transactions collide, prisma gives P2034, and the shared filter answers 409 "the server was busy".
    await this.prisma.$transaction(
      async (tx) => {
        // the current state of the group. a removed or deleted group acts as if it does not exist.
        const group = await tx.group.findFirst({
          where: { id: groupId, deletedAt: null, status: { not: GroupStatus.removed } },
          select: {
            leaderId: true,
            status: true,
            subjectId: true,
            levelId: true,
            examDate: true,
            mode: true,
            location: true,
          },
        });
        if (!group) {
          throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
        }

        // only the leader may change the group.
        // safety: the leader is read from the database, never from the request.
        if (group.leaderId !== userId) {
          // someone who may not even see an archived group gets 404, the same as for a missing group.
          if (group.status === GroupStatus.archived && !(await this.findActiveMembership(groupId, userId, tx))) {
            throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
          }
          // everyone else may see the group, so the honest answer is "not allowed".
          throw new ForbiddenException(LEADER_ONLY_MESSAGE);
        }

        // the location rule looks at the new value of each field, or the old value when the field was not sent.
        const newMode = dto.mode ?? group.mode;
        const newLocation = dto.location !== undefined ? dto.location : group.location;
        this.assertLocationRule(newMode, newLocation);

        // the exam date is checked only when it really changes.
        // so a leader who resends an old past date with the rest of the form is not refused.
        if (dto.examDate != null && dto.examDate !== toDateOnly(group.examDate)) {
          this.assertExamDateNotPast(dto.examDate);
        }

        // the same idea for the subject and the level: they are checked only when they change.
        // a subject the admin hid later stays on old groups, but nobody can pick it again.
        if (dto.subjectId !== undefined && dto.subjectId !== group.subjectId) {
          await this.assertActiveSubject(tx, dto.subjectId);
        }
        if (dto.levelId != null && dto.levelId !== group.levelId) {
          await this.assertActiveLevel(tx, dto.levelId);
        }

        // the new size must still hold every active member. the leader counts as a member.
        if (dto.maxSize !== undefined) {
          const activeMembers = await tx.groupMember.count({
            where: { groupId, status: GroupMemberStatus.active },
          });
          if (dto.maxSize < activeMembers) {
            throw new ConflictException(SIZE_BELOW_MEMBERS_MESSAGE);
          }
        }

        // every check passed, so the change is saved.
        await tx.group.update({ where: { id: groupId }, data });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // read the changed group back in the reply shape.
    return this.getGroup(groupId, userId);
  }

  // finds the person's active membership in a group, or null. it can run inside a transaction ("tx") or on its own.
  private findActiveMembership(
    groupId: number,
    userId: number,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    return client.groupMember.findFirst({
      where: { groupId, userId, status: GroupMemberStatus.active },
      select: { role: true },
    });
  }

  // refuses an in-person group without a place to meet. an online group may leave the location empty.
  private assertLocationRule(mode: Mode, location: string | null): void {
    if (mode === Mode.in_person && location === null) {
      throw new BadRequestException(LOCATION_REQUIRED_MESSAGE);
    }
  }

  // refuses an exam date before today. "YYYY-MM-DD" texts sort like dates, so a plain text compare is enough.
  private assertExamDateNotPast(examDate: string): void {
    if (examDate < todayUtc()) {
      throw new BadRequestException(EXAM_DATE_IN_PAST_MESSAGE);
    }
  }

  // the subject must exist and be active. a hidden subject gets the same 404 as an unknown one.
  private async assertActiveSubject(tx: Prisma.TransactionClient, subjectId: number): Promise<void> {
    const subject = await tx.subject.findFirst({
      where: { id: subjectId, isActive: true },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }
  }

  // the level must exist and be active. a hidden level gets the same 404 as an unknown one.
  private async assertActiveLevel(tx: Prisma.TransactionClient, levelId: number): Promise<void> {
    const level = await tx.level.findFirst({
      where: { id: levelId, isActive: true },
      select: { id: true },
    });
    if (!level) {
      throw new NotFoundException(LEVEL_NOT_FOUND_MESSAGE);
    }
  }
}