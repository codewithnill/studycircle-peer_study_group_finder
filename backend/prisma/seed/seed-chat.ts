// this file creates chat messages and group posts, so the group pages look alive.
// the rules it follows by itself, because the seed skips the app code:
// 1. only active members send chat messages.
// 2. the leader can always post. other members post only when members_can_post is on.
// 3. posts stay inside their group. there is no global feed.

// borrows the client type only. the client itself is passed in from seed.ts.
import type { PrismaClient } from '../../src/generated/prisma/client';
// borrows the random helper type.
import type { SeededRandom } from './random';
// borrows the date helper from seed-groups.ts.
import { addDays } from './seed-groups';
// borrows the type of one saved group.
import type { SeededGroup } from './seed-groups';
// borrows the fake chat lines and post texts from data.ts.
import { CHAT_LINES, POST_BODIES, POST_TITLES } from './data';

// one row for the group_posts table.
interface PostRow {
  groupId: number;
  authorId: number;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
}

// creates messages and posts for every group that is not removed.
export async function seedChat(
  prisma: PrismaClient,
  groups: SeededGroup[],
  rng: SeededRandom,
): Promise<void> {
  // "now" is read once, so every date in this run is based on the same moment.
  const now = new Date();

  for (const group of groups) {
    // a group removed by an admin gets no chat and no posts.
    if (group.status === 'removed') {
      continue;
    }

    // every active member has joined by this date. messages are written after it,
    // so nobody writes in a group before joining it.
    const latestJoin = addDays(group.createdAt, group.activeMemberIds.length);
    // the time between that date and now, in milliseconds. it is always more than a few days.
    const spanMs = now.getTime() - latestJoin.getTime();

    // ----- chat messages -----

    // active groups chat more. closed and archived groups only keep a short history.
    const messageCount = group.status === 'active' ? rng.int(10, 20) : rng.int(5, 8);

    // make random times inside the span and sort them, oldest first. messages are saved in
    // this order, so the message ids grow with time, and chat history loads in the right order.
    const times = Array.from(
      { length: messageCount },
      () => new Date(latestJoin.getTime() + Math.floor(rng.next() * spanMs)),
    ).sort((a, b) => a.getTime() - b.getTime());

    // the chat lines are written like one conversation. the seed starts at a random line
    // and then moves forward, so neighbouring messages fit together.
    const startLine = rng.int(0, CHAT_LINES.length - 1);

    // build the message rows. safety: only active members are picked as senders.
    const messageRows = times.map((createdAt, i) => ({
      groupId: group.id,
      userId: rng.pick(group.activeMemberIds),
      body: CHAT_LINES[(startLine + i) % CHAT_LINES.length] as string,
      createdAt,
    }));

    // save all messages with one command.
    await prisma.message.createMany({ data: messageRows });

    // ----- group posts (active groups only) -----

    if (group.status !== 'active') {
      continue;
    }

    // the title list and the body list have the same length, so one position picks both.
    const postIndexes = POST_TITLES.map((_, i) => i);
    // this list collects the posts.
    const postRows: PostRow[] = [];

    // the leader writes zero, one, or two posts. sample() gives different positions,
    // so one group never repeats the same post.
    const leaderPicks = rng.sample(postIndexes, rng.int(0, 2));
    for (const [n, postIndex] of leaderPicks.entries()) {
      postRows.push({
        groupId: group.id,
        // the leader can always post.
        authorId: group.leaderId,
        title: POST_TITLES[postIndex] as string,
        body: POST_BODIES[postIndex] as string,
        // only the leader can pin. the first post is pinned about half of the time.
        isPinned: n === 0 && rng.chance(0.5),
        // leader posts are written in the first days after the group was created.
        createdAt: addDays(group.createdAt, rng.int(0, 5)),
      });
    }

    // other members can post only when the group setting allows it.
    // the leader is always the first active member, so everyone else is a normal member.
    const memberAuthors = group.activeMemberIds.filter((id) => id !== group.leaderId);
    if (group.membersCanPost && memberAuthors.length > 0) {
      const postIndex = rng.int(0, postIndexes.length - 1);
      postRows.push({
        groupId: group.id,
        authorId: rng.pick(memberAuthors),
        title: POST_TITLES[postIndex] as string,
        body: POST_BODIES[postIndex] as string,
        // a normal member cannot pin.
        isPinned: false,
        createdAt: new Date(latestJoin.getTime() + Math.floor(rng.next() * spanMs)),
      });
    }

    // save the posts, if there are any.
    if (postRows.length > 0) {
      await prisma.groupPost.createMany({ data: postRows });
    }
  }
}