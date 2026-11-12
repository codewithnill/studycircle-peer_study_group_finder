// this file creates 25 study groups, their members, and their join requests.
// the seed skips the app code, so this file must follow the project rules by itself:
// 1. every group has exactly one active leader.
// 2. the group row and the leader member row are created together in one transaction.
// 3. active members never go over max_size. the leader counts as a member.
// 4. a student has at most one pending request per group.

// borrows the client type only. the client itself is passed in from seed.ts.
import type { PrismaClient } from '../../src/generated/prisma/client';
// borrows the random helper type.
import type { SeededRandom } from './random';
// borrows the type of the levels and subjects that seed-lookups.ts saved.
import type { SeededLookups } from './seed-lookups';
// borrows the fake word lists from data.ts.
import {
  CAMPUS_LOCATIONS,
  GROUP_DESCRIPTIONS,
  GROUP_TITLE_SUFFIXES,
  JOIN_REQUEST_MESSAGES,
  REJECT_NOTES,
  SUBJECT_TOPICS,
} from './data';

// these types repeat the exact enum words from studycircle_fixed_values.md.
// the database enums accept these same words, so a typo here fails the type check.
type GroupStatus = 'active' | 'closed' | 'archived' | 'removed';
type Mode = 'online' | 'in_person';
type MemberRole = 'leader' | 'member';
type MemberStatus = 'active' | 'left' | 'removed';
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// how many milliseconds are in one day. dates in javascript count in milliseconds.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// returns a new date that is the given number of days after (or before, if negative) the start date.
// it is exported because the session seeding step needs the same helper.
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

// returns a date-only value (midnight, utc) for today plus the given number of days.
// the exam_date column holds a plain date, so the time part must be the same every time.
function dateFromToday(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

// the plan for one group. the list below fixes the mix of data, so search has variety.
interface GroupPlan {
  status: GroupStatus;
  // days from today until the exam. negative means the exam date is in the past. null means no exam.
  examInDays: number | null;
  // true means the group is filled to max_size, to test "no seats left".
  full?: boolean;
  // true means an admin flagged the group for review.
  flagged?: boolean;
}

// 25 plans: 20 active, 2 closed, 2 archived, 1 removed.
// 4 active groups have a past exam date, and 4 groups have no exam date.
const GROUP_PLANS: readonly GroupPlan[] = [
  { status: 'active', examInDays: 6 },
  { status: 'active', examInDays: 12, full: true },
  { status: 'active', examInDays: 19 },
  { status: 'active', examInDays: null },
  { status: 'active', examInDays: 9 },
  { status: 'active', examInDays: 25, flagged: true },
  { status: 'active', examInDays: -10 },
  { status: 'active', examInDays: 14, full: true },
  { status: 'active', examInDays: 31 },
  { status: 'active', examInDays: null },
  { status: 'active', examInDays: 4 },
  { status: 'active', examInDays: 21 },
  { status: 'active', examInDays: -4 },
  { status: 'active', examInDays: 17 },
  { status: 'active', examInDays: 40 },
  { status: 'active', examInDays: null },
  { status: 'active', examInDays: 8 },
  { status: 'active', examInDays: 28 },
  { status: 'active', examInDays: -18 },
  { status: 'closed', examInDays: 5 },
  { status: 'closed', examInDays: null },
  { status: 'archived', examInDays: -30 },
  { status: 'archived', examInDays: 45 },
  { status: 'removed', examInDays: 10 },
  { status: 'active', examInDays: -2 },
];

// one row for the group_members table, before the group id is known.
interface MemberRow {
  userId: number;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: Date;
  leftAt: Date | null;
  removedBy: number | null;
}

// one row for the join_requests table, before the group id is known.
interface RequestRow {
  userId: number;
  message: string;
  status: RequestStatus;
  reviewedBy: number | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

// what this file hands back for each group. chat, posts, and sessions use it later.
export interface SeededGroup {
  id: number;
  status: GroupStatus;
  leaderId: number;
  // the ids of all active members. the leader is always the first one.
  activeMemberIds: number[];
  title: string;
  topic: string | null;
  mode: Mode;
  maxSize: number;
  membersCanPost: boolean;
  createdAt: Date;
}

// creates every group with its members and join requests, and returns the saved groups.
export async function seedGroups(
  prisma: PrismaClient,
  studentIds: number[],
  lookups: SeededLookups,
  rng: SeededRandom,
): Promise<SeededGroup[]> {
  // "now" is read once, so every date in this run is based on the same moment.
  const now = new Date();

  // this list collects the saved groups.
  const seeded: SeededGroup[] = [];

  // walk through the 25 plans. entries() gives the position (index) and the plan together.
  for (const [index, plan] of GROUP_PLANS.entries()) {
    // each group gets a different leader, taken in order from the student list.
    const leaderId = studentIds[index % studentIds.length];
    // each group gets a subject, taken in order. subjects repeat after twelve groups.
    const subject = lookups.subjects[index % lookups.subjects.length];
    // stop with a clear message if a list was empty, so no undefined value moves on.
    if (leaderId === undefined || subject === undefined) {
      throw new Error('seed-groups: the student list or the subject list is empty.');
    }

    // ----- the group's own details -----

    // the group was created between 20 and 50 days ago.
    const createdAt = addDays(now, -rng.int(20, 50));
    // the title joins the subject and a short phrase, for example "Algorithms — Midterm Prep".
    const title = `${subject.name} — ${rng.pick(GROUP_TITLE_SUFFIXES)}`;
    // pick a topic that belongs to this subject. some subjects may have no topic list.
    const topics = SUBJECT_TOPICS[subject.name] ?? [];
    const topic = topics.length > 0 ? rng.pick(topics) : null;
    // a little more than half of the groups meet online.
    const mode: Mode = rng.chance(0.55) ? 'online' : 'in_person';
    // an in-person group must have a location. an online group has none.
    const location = mode === 'in_person' ? rng.pick(CAMPUS_LOCATIONS) : null;
    // a full group has four seats. other groups have four to twelve seats.
    const maxSize = plan.full ? 4 : rng.int(4, 12);
    // about one group in four lets members post.
    const membersCanPost = rng.chance(0.25);
    // the level is optional, so about one group in seven has none.
    const levelId = rng.chance(0.15) ? null : rng.pick(lookups.levels).id;

    // ----- who is inside the group -----

    // a full group has maxSize active members. other groups always keep at least one free seat.
    const activeCount = plan.full ? maxSize : rng.int(1, maxSize - 1);
    // some groups also have one person who left and one who was removed. full groups have none.
    const leftCount = !plan.full && rng.chance(0.3) ? 1 : 0;
    const removedCount = !plan.full && rng.chance(0.15) ? 1 : 0;

    // shuffle every student except the leader. the list is then cut into separate parts,
    // so one student can never appear twice in the same group.
    const others = rng.shuffle(studentIds.filter((id) => id !== leaderId));
    // the leader counts as one active member, so one fewer person is needed here.
    const activeIds = others.slice(0, activeCount - 1);
    const leftIds = others.slice(activeCount - 1, activeCount - 1 + leftCount);
    const removedIds = others.slice(activeCount - 1 + leftCount, activeCount - 1 + leftCount + removedCount);
    // everyone who is left over can ask to join.
    const requesterPool = others.slice(activeCount - 1 + leftCount + removedCount);

    // the first member row is the leader. the leader joined on the day the group was created.
    const memberRows: MemberRow[] = [
      { userId: leaderId, role: 'leader', status: 'active', joinedAt: createdAt, leftAt: null, removedBy: null },
    ];
    // the join request rows are collected here.
    const requestRows: RequestRow[] = [];

    // "order" counts the non-leader members. each one joined one day after the one before,
    // so joined_at is always different. the longest-standing member is easy to find.
    let order = 0;

    // active members: each one joined through an approved request.
    for (const userId of activeIds) {
      order += 1;
      const joinedAt = addDays(createdAt, order);
      memberRows.push({ userId, role: 'member', status: 'active', joinedAt, leftAt: null, removedBy: null });
      requestRows.push({
        userId,
        message: rng.pick(JOIN_REQUEST_MESSAGES),
        status: 'approved',
        reviewedBy: leaderId,
        reviewNote: null,
        reviewedAt: joinedAt,
        createdAt: addDays(joinedAt, -1),
      });
    }

    // members who left by themselves. the row stays, so study history is not lost.
    for (const userId of leftIds) {
      order += 1;
      const joinedAt = addDays(createdAt, order);
      memberRows.push({
        userId, role: 'member', status: 'left', joinedAt, leftAt: addDays(joinedAt, 2), removedBy: null,
      });
    }

    // members who were removed by the leader. removed_by points to the leader.
    for (const userId of removedIds) {
      order += 1;
      const joinedAt = addDays(createdAt, order);
      memberRows.push({
        userId, role: 'member', status: 'removed', joinedAt, leftAt: addDays(joinedAt, 3), removedBy: leaderId,
      });
    }

    // ----- open join requests (only active groups get new requests) -----

    if (plan.status === 'active') {
      // decide how many requests of each status this group gets.
      // group 0 always gets one of each kind, so every status exists in the demo.
      // full groups get one pending request, to test "approving needs a free seat".
      let pendingCount = rng.int(0, 2);
      let rejectedCount = rng.chance(0.3) ? 1 : 0;
      let cancelledCount = rng.chance(0.25) ? 1 : 0;
      if (index === 0) {
        pendingCount = 2;
        rejectedCount = 1;
        cancelledCount = 1;
      } else if (plan.full) {
        pendingCount = 1;
        rejectedCount = 0;
        cancelledCount = 0;
      }

      // build one list of wanted statuses, then give each one a different student from the pool.
      const wanted: RequestStatus[] = [];
      for (let n = 0; n < pendingCount; n++) wanted.push('pending');
      for (let n = 0; n < rejectedCount; n++) wanted.push('rejected');
      for (let n = 0; n < cancelledCount; n++) wanted.push('cancelled');

      // "cursor" walks through the pool. no student is used twice, so a student never has
      // two pending requests in the same group.
      let cursor = 0;
      for (const status of wanted) {
        const userId = requesterPool[cursor];
        cursor += 1;
        // stop early if the pool ran out. this is very unlikely with thirty students.
        if (userId === undefined) break;

        if (status === 'pending') {
          // a pending request has no reviewer yet.
          requestRows.push({
            userId,
            message: rng.pick(JOIN_REQUEST_MESSAGES),
            status,
            reviewedBy: null,
            reviewNote: null,
            reviewedAt: null,
            createdAt: addDays(now, -rng.int(0, 5)),
          });
        } else if (status === 'rejected') {
          // a rejected request has a reviewer, a reason, and a review time.
          const requestedAt = addDays(now, -rng.int(3, 9));
          requestRows.push({
            userId,
            message: rng.pick(JOIN_REQUEST_MESSAGES),
            status,
            reviewedBy: leaderId,
            reviewNote: rng.pick(REJECT_NOTES),
            reviewedAt: addDays(requestedAt, 1),
            createdAt: requestedAt,
          });
        } else {
          // a cancelled request was withdrawn by the student, so it has no reviewer.
          requestRows.push({
            userId,
            message: rng.pick(JOIN_REQUEST_MESSAGES),
            status,
            reviewedBy: null,
            reviewNote: null,
            reviewedAt: null,
            createdAt: addDays(now, -rng.int(2, 7)),
          });
        }
      }
    }

    // ----- save everything in one transaction -----

    // $transaction runs all steps inside as one unit. if one step fails, none of them are saved.
    // this is how the group row and the leader member row are created together.
    const groupId = await prisma.$transaction(async (tx) => {
      // step 1: create the group. leaderId is saved here.
      const group = await tx.group.create({
        data: {
          subjectId: subject.id,
          levelId,
          leaderId,
          title,
          topic,
          description: rng.pick(GROUP_DESCRIPTIONS),
          // a null exam date means the group is about a skill and not an exam.
          examDate: plan.examInDays === null ? null : dateFromToday(plan.examInDays),
          mode,
          location,
          maxSize,
          status: plan.status,
          isFlagged: plan.flagged === true,
          membersCanPost,
          createdAt,
        },
        select: { id: true },
      });

      // step 2: create all member rows, including the one leader row.
      // the database also refuses a second active leader, as a safety net.
      await tx.groupMember.createMany({
        data: memberRows.map((row) => ({ groupId: group.id, ...row })),
      });

      // step 3: create the join requests, if there are any.
      if (requestRows.length > 0) {
        await tx.joinRequest.createMany({
          data: requestRows.map((row) => ({ groupId: group.id, ...row })),
        });
      }

      // hand the new group id out of the transaction.
      return group.id;
    });

    // remember this group for the later seed steps.
    seeded.push({
      id: groupId,
      status: plan.status,
      leaderId,
      activeMemberIds: [leaderId, ...activeIds],
      title,
      topic,
      mode,
      maxSize,
      membersCanPost,
      createdAt,
    });
  }

  // hand the saved groups to the next steps.
  return seeded;
}