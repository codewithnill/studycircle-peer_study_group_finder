// this file checks the finished seed data against the project rules.
// the seed skips the app code, so a bug in a seed file could break a rule without any error.
// this file reads the data back and fails loudly when a rule is broken.
// it only reads. it never changes any data.

// borrows the client type only. the client itself is passed in from seed.ts.
import type { PrismaClient } from '../../src/generated/prisma/client';
// borrows the expected sizes from data.ts.
import { LEVELS, STUDENT_COUNT, SUBJECTS } from './data';

// the number of groups in the plan inside seed-groups.ts. change this too when that plan changes.
const EXPECTED_GROUPS = 25;

// the start of today in utc, as a plain date. exam dates are plain dates too.
function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// runs every check. it throws one error that lists all failed checks.
export async function verifySeed(prisma: PrismaClient): Promise<void> {
  // this list collects the names of the failed checks.
  const problems: string[] = [];
  // this counter counts how many checks ran.
  let checks = 0;

  // records one check. a failed check is added to the problem list with an optional detail.
  const check = (name: string, ok: boolean, detail = ''): void => {
    checks += 1;
    if (!ok) {
      problems.push(detail ? `${name} (${detail})` : name);
    }
  };

  // ----- 1. counts -----

  const [adminCount, studentCount, levelCount, subjectCount, groupCount] = await Promise.all([
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.level.count(),
    prisma.subject.count(),
    prisma.group.count(),
  ]);
  check('one admin', adminCount === 1, `found ${adminCount}`);
  check('student count', studentCount === STUDENT_COUNT, `found ${studentCount}`);
  check('level count', levelCount === LEVELS.length, `found ${levelCount}`);
  check('subject count', subjectCount === SUBJECTS.length, `found ${subjectCount}`);
  check('group count', groupCount === EXPECTED_GROUPS, `found ${groupCount}`);

  // ----- 2. leader rules and group size -----

  // read the groups and all member rows once. the data is small, so this is fast.
  const groups = await prisma.group.findMany({
    select: { id: true, leaderId: true, maxSize: true, mode: true, location: true, examDate: true },
  });
  const members = await prisma.groupMember.findMany({
    select: { groupId: true, userId: true, role: true, status: true },
  });

  // collect the active leaders of each group, and count the active members of each group.
  const activeLeaders = new Map<number, number[]>();
  const activeCounts = new Map<number, number>();
  // a set of "group:user" keys for every active member. later checks use it.
  const activeKeys = new Set<string>();
  for (const member of members) {
    if (member.status !== 'active') {
      continue;
    }
    activeKeys.add(`${member.groupId}:${member.userId}`);
    activeCounts.set(member.groupId, (activeCounts.get(member.groupId) ?? 0) + 1);
    if (member.role === 'leader') {
      const list = activeLeaders.get(member.groupId) ?? [];
      list.push(member.userId);
      activeLeaders.set(member.groupId, list);
    }
  }

  // groups that break a rule are collected, so the error message can name them.
  const badLeader: number[] = [];
  const overSize: number[] = [];
  const badInPerson: number[] = [];
  for (const group of groups) {
    const leaders = activeLeaders.get(group.id) ?? [];
    // exactly one active leader, and the same person as groups.leader_id.
    if (leaders.length !== 1 || leaders[0] !== group.leaderId) {
      badLeader.push(group.id);
    }
    // active members, with the leader, never go over max_size.
    if ((activeCounts.get(group.id) ?? 0) > group.maxSize) {
      overSize.push(group.id);
    }
    // an in-person group must have a location.
    if (group.mode === 'in_person' && !group.location) {
      badInPerson.push(group.id);
    }
  }
  check('exactly one active leader per group, matching leader_id', badLeader.length === 0, `groups ${badLeader.join(', ')}`);
  check('active members never go over max_size', overSize.length === 0, `groups ${overSize.join(', ')}`);
  check('in-person groups have a location', badInPerson.length === 0, `groups ${badInPerson.join(', ')}`);

  // ----- 3. search variety -----

  const today = startOfTodayUtc();
  check('some groups have a past exam date', groups.some((g) => g.examDate !== null && g.examDate < today));
  check('some groups have a future exam date', groups.some((g) => g.examDate !== null && g.examDate >= today));
  check('some groups have no exam date', groups.some((g) => g.examDate === null));
  check('some groups are online', groups.some((g) => g.mode === 'online'));
  check('some groups are in person', groups.some((g) => g.mode === 'in_person'));
  check('some group is full', groups.some((g) => (activeCounts.get(g.id) ?? 0) === g.maxSize));

  // ----- 4. join requests -----

  const requests = await prisma.joinRequest.findMany({ select: { groupId: true, userId: true, status: true } });

  // at most one pending request per student per group. a repeated key means a duplicate.
  const pendingKeys = new Set<string>();
  let duplicatePending = 0;
  for (const request of requests) {
    if (request.status !== 'pending') {
      continue;
    }
    const key = `${request.groupId}:${request.userId}`;
    if (pendingKeys.has(key)) {
      duplicatePending += 1;
    }
    pendingKeys.add(key);
  }
  check('at most one pending request per student per group', duplicatePending === 0, `${duplicatePending} duplicates`);

  // every request status appears at least once.
  const requestStatuses = new Set(requests.map((r) => r.status));
  for (const status of ['pending', 'approved', 'rejected', 'cancelled'] as const) {
    check(`some join requests are ${status}`, requestStatuses.has(status));
  }

  // ----- 5. sessions, attendance, and reviews -----

  const sessions = await prisma.studySession.findMany({ select: { status: true } });
  const sessionStatuses = new Set(sessions.map((s) => s.status));
  for (const status of ['scheduled', 'completed', 'cancelled'] as const) {
    check(`some sessions are ${status}`, sessionStatuses.has(status));
  }

  // reviews only on completed sessions.
  const reviewsOnOpenSessions = await prisma.review.count({
    where: { session: { status: { not: 'completed' } } },
  });
  check('reviews exist only on completed sessions', reviewsOnOpenSessions === 0, `found ${reviewsOnOpenSessions}`);

  // reviewers and attendees must be active members of the session's group.
  const reviews = await prisma.review.findMany({ select: { userId: true, session: { select: { groupId: true } } } });
  const outsideReviewers = reviews.filter((r) => !activeKeys.has(`${r.session.groupId}:${r.userId}`)).length;
  check('only active members write reviews', outsideReviewers === 0, `found ${outsideReviewers}`);

  const attendances = await prisma.sessionAttendance.findMany({
    select: { userId: true, session: { select: { groupId: true } } },
  });
  const outsideAttendees = attendances.filter((a) => !activeKeys.has(`${a.session.groupId}:${a.userId}`)).length;
  check('only active members attend sessions', outsideAttendees === 0, `found ${outsideAttendees}`);

  // ----- 6. chat and posts -----

  // distinct gives one row per (group, sender) pair, so the check stays fast.
  const senders = await prisma.message.findMany({
    select: { groupId: true, userId: true },
    distinct: ['groupId', 'userId'],
  });
  const outsideSenders = senders.filter((s) => !activeKeys.has(`${s.groupId}:${s.userId}`)).length;
  check('only active members send chat messages', outsideSenders === 0, `found ${outsideSenders}`);

  // a post needs an author who is the leader, or a member in a group that lets members post.
  const posts = await prisma.groupPost.findMany({
    select: { groupId: true, authorId: true, isPinned: true, group: { select: { leaderId: true, membersCanPost: true } } },
  });
  const badPosts = posts.filter(
    (p) =>
      !activeKeys.has(`${p.groupId}:${p.authorId}`) ||
      (p.authorId !== p.group.leaderId && !p.group.membersCanPost) ||
      // only the leader can pin.
      (p.isPinned && p.authorId !== p.group.leaderId),
  ).length;
  check('posts follow the posting and pinning rules', badPosts === 0, `found ${badPosts}`);

  // ----- 7. safety and clean rows -----

  // every password is a bcrypt hash. a bcrypt hash always starts with "$2".
  const plainPasswords = await prisma.user.count({ where: { passwordHash: { not: { startsWith: '$2' } } } });
  check('every password is hashed', plainPasswords === 0, `found ${plainPasswords}`);

  // deleted_at stays empty on all seed rows.
  const [deletedUsers, deletedGroups, deletedMessages, deletedPosts, deletedFiles] = await Promise.all([
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.group.count({ where: { deletedAt: { not: null } } }),
    prisma.message.count({ where: { deletedAt: { not: null } } }),
    prisma.groupPost.count({ where: { deletedAt: { not: null } } }),
    prisma.groupFile.count({ where: { deletedAt: { not: null } } }),
  ]);
  check(
    'deleted_at is empty on every seed row',
    deletedUsers + deletedGroups + deletedMessages + deletedPosts + deletedFiles === 0,
  );

  // ----- result -----

  // one error lists every failed check, so all problems can be fixed in one go.
  if (problems.length > 0) {
    throw new Error(`seed verify failed:\n- ${problems.join('\n- ')}`);
  }

  console.log(`seed: verify passed. ${checks} checks ok.`);
}