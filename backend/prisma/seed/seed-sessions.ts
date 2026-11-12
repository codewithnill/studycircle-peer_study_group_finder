// this file creates study sessions for the groups, plus "i will attend" rows and reviews.
// the seed skips the app code, so this file must follow the project rules by itself:
// 1. the leader creates every session.
// 2. an online session has a meeting link. an in-person session has a place.
// 3. only active members of the group can attend. one row per person per session.
// 4. only a completed session can have reviews. one review per person per session.
// 5. a review comes only from a member who attended.

// borrows the client type only. the client itself is passed in from seed.ts.
import type { PrismaClient } from '../../src/generated/prisma/client';
// borrows the random helper type.
import type { SeededRandom } from './random';
// borrows the date helper from seed-groups.ts.
import { addDays } from './seed-groups';
// borrows the type of one saved group.
import type { SeededGroup } from './seed-groups';
// borrows the fake word lists from data.ts.
import {
  CAMPUS_LOCATIONS,
  CANCEL_REASONS,
  MEETING_LINK_BASE,
  REVIEW_COMMENTS,
  SESSION_TITLES,
} from './data';

// the exact status words from studycircle_fixed_values.md (section a8).
type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

// how many milliseconds are in one day and one hour. dates in javascript count in milliseconds.
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

// possible lengths of a session, in minutes.
const SESSION_DURATIONS: readonly number[] = [60, 90, 120];

// possible start hours in utc. the values make sense in local time for the demo users.
const START_HOURS: readonly number[] = [8, 10, 12, 14, 16];

// star ratings. the list leans to the high side, like real reviews.
const RATINGS: readonly number[] = [2, 3, 4, 4, 4, 5, 5, 5];

// the plan for one session before it is saved.
interface SessionPlan {
  status: SessionStatus;
  scheduledAt: Date;
}

// returns a copy of a date with the time set to a whole hour (utc).
function atHour(date: Date, hour: number): Date {
  // copy first, so the original date is not changed.
  const copy = new Date(date.getTime());
  copy.setUTCHours(hour, 0, 0, 0);
  return copy;
}

// decides how many sessions a group gets and when they happen.
function planSessions(
  group: SeededGroup,
  isFirstGroup: boolean,
  now: Date,
  rng: SeededRandom,
): SessionPlan[] {
  // a group removed by an admin gets no sessions.
  if (group.status === 'removed') {
    return [];
  }

  // how many sessions of each status this group gets.
  let completedCount: number;
  let scheduledCount = 0;
  let cancelledCount = 0;

  if (isFirstGroup) {
    // the first group always has two completed, one scheduled, and one cancelled session,
    // so every status exists in the demo data.
    completedCount = 2;
    scheduledCount = 1;
    cancelledCount = 1;
  } else if (group.status === 'active') {
    // active groups get a mix. some have none at all.
    completedCount = rng.int(0, 2);
    scheduledCount = rng.int(0, 2);
    cancelledCount = rng.chance(0.25) ? 1 : 0;
  } else {
    // closed and archived groups only have history, so they get completed sessions.
    completedCount = rng.int(1, 2);
  }

  // every active member has joined by this date. completed sessions happen after it,
  // so nobody attends a session before joining the group.
  const latestJoin = addDays(group.createdAt, group.activeMemberIds.length);
  // the number of whole days between that date and now, minus one day of space.
  const span = Math.max(1, Math.floor((now.getTime() - latestJoin.getTime()) / MS_PER_DAY) - 1);

  // this list collects the plans.
  const plans: SessionPlan[] = [];

  // completed sessions are in the past.
  for (let n = 0; n < completedCount; n++) {
    plans.push({
      status: 'completed',
      scheduledAt: atHour(addDays(latestJoin, rng.int(1, span)), rng.pick(START_HOURS)),
    });
  }

  // scheduled sessions are in the future. at least two days ahead, so they are never "now".
  for (let n = 0; n < scheduledCount; n++) {
    plans.push({
      status: 'scheduled',
      scheduledAt: atHour(addDays(now, rng.int(2, 14)), rng.pick(START_HOURS)),
    });
  }

  // cancelled sessions were planned for the near future and then called off.
  for (let n = 0; n < cancelledCount; n++) {
    plans.push({
      status: 'cancelled',
      scheduledAt: atHour(addDays(now, rng.int(2, 10)), rng.pick(START_HOURS)),
    });
  }

  return plans;
}

// creates the sessions for every group, with attendance rows and reviews.
export async function seedSessions(
  prisma: PrismaClient,
  groups: SeededGroup[],
  rng: SeededRandom,
): Promise<void> {
  // "now" is read once, so every date in this run is based on the same moment.
  const now = new Date();

  // walk through the groups. entries() gives the position and the group together.
  for (const [index, group] of groups.entries()) {
    // decide the sessions for this group.
    const plans = planSessions(group, index === 0, now, rng);

    // a counter that keeps the fake meeting links different inside one group.
    let linkNumber = 0;

    for (const plan of plans) {
      // pick the length of the session.
      const durationMinutes = rng.pick(SESSION_DURATIONS);

      // the session was created about three days before it happens, but never before the
      // group existed and never in the future.
      const earliest = group.createdAt.getTime();
      const wanted = addDays(plan.scheduledAt, -3).getTime();
      const createdAt = new Date(Math.min(Math.max(earliest, wanted), now.getTime()));

      // an online session gets a fake link. an in-person session gets a fake place.
      linkNumber += 1;
      const isOnline = group.mode === 'online';

      // create the session. the leader is always the creator.
      const session = await prisma.studySession.create({
        data: {
          groupId: group.id,
          createdBy: group.leaderId,
          title: rng.pick(SESSION_TITLES),
          topic: group.topic,
          description: group.topic ? `The session covers: ${group.topic}.` : null,
          scheduledAt: plan.scheduledAt,
          durationMinutes,
          mode: group.mode,
          location: isOnline ? null : rng.pick(CAMPUS_LOCATIONS),
          // example.com is reserved for examples, so the link never leads to a real meeting.
          meetingLink: isOnline ? `${MEETING_LINK_BASE}sc-${group.id}-${linkNumber}` : null,
          status: plan.status,
          // a cancelled session must show a reason to the members.
          cancelReason: plan.status === 'cancelled' ? rng.pick(CANCEL_REASONS) : null,
          createdAt,
        },
        select: { id: true },
      });

      // a cancelled session has no attendance and no reviews.
      if (plan.status === 'cancelled') {
        continue;
      }

      // between half of the active members and all of them clicked "i will attend".
      // sample() never picks the same member twice, so the (session, user) pair stays unique.
      const memberCount = group.activeMemberIds.length;
      const attendeeCount = rng.int(Math.ceil(memberCount / 2), memberCount);
      const attendees = rng.sample(group.activeMemberIds, attendeeCount);

      // build the attendance rows. for a completed session the leader has marked who came.
      // for a scheduled session nobody is marked yet, so the value stays empty (null).
      const attendanceRows = attendees.map((userId) => ({
        sessionId: session.id,
        userId,
        attended: plan.status === 'completed' ? rng.chance(0.85) : null,
      }));

      // save all attendance rows with one command.
      await prisma.sessionAttendance.createMany({ data: attendanceRows });

      // reviews exist only for completed sessions.
      if (plan.status === 'completed') {
        // only members who really came can review. about six in ten of them do.
        const reviewRows = attendanceRows
          .filter((row) => row.attended === true && rng.chance(0.6))
          .map((row) => ({
            sessionId: session.id,
            userId: row.userId,
            rating: rng.pick(RATINGS),
            // about six in ten reviews have a comment.
            comment: rng.chance(0.6) ? rng.pick(REVIEW_COMMENTS) : null,
            // the review is written one hour after the session ends.
            createdAt: new Date(plan.scheduledAt.getTime() + durationMinutes * 60 * 1000 + MS_PER_HOUR),
          }));

        // save the reviews, if there are any.
        if (reviewRows.length > 0) {
          await prisma.review.createMany({ data: reviewRows });
        }
      }
    }
  }
}