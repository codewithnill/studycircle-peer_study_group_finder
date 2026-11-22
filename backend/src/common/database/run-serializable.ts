// import: "Prisma" gives the transaction level words, like "Serializable", and the type of the client inside a transaction.
// import: "PrismaClient" is the type of the database connection. only its "$transaction" part is used here.
import { Prisma, PrismaClient } from '../../generated/prisma/client';

// how many times one piece of database work may run in total: the first try plus two more.
// most collisions clear on the second try, so 3 is enough without making the person wait long.
export const SERIALIZABLE_MAX_ATTEMPTS = 3;

// the prisma error code for "two transactions collided, try again".
// postgres raises it when a serializable transaction would break the "one after the other" promise.
export const TRANSACTION_CONFLICT_CODE = 'P2034';

// the smallest part of the database connection that this file needs: only "$transaction".
// "Pick" takes one part of a bigger type. this keeps the helper easy to test with a small fake.
export type TransactionRunner = Pick<PrismaClient, '$transaction'>;

// checks whether an error is the prisma "transactions collided" error (P2034).
// the error's name is checked instead of the prisma error class, the same way the shared error filter does it.
// this way a fake error in a unit test works too.
export function isTransactionConflict(error: unknown): boolean {
  // only a real error object can be a prisma error.
  if (!(error instanceof Error) || error.name !== 'PrismaClientKnownRequestError') {
    return false;
  }
  // a known prisma error carries its code, for example "P2034".
  return (error as { code?: unknown }).code === TRANSACTION_CONFLICT_CODE;
}

// waits for the given number of milliseconds. it is used for a short pause between two tries.
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// runs one piece of database work inside a transaction at the serializable level,
// and runs it again from the start when it collides with another transaction.
// "serializable" makes postgres act as if transactions ran one after the other, never at the same time.
// this replaces a row lock, which prisma does not offer without raw sql.
// "<T>" means the helper gives back whatever the work gives back.
export async function runSerializable<T>(
  prisma: TransactionRunner,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts: number = SERIALIZABLE_MAX_ATTEMPTS,
): Promise<T> {
  // the number of the current try, starting at 1.
  let attempt = 1;

  // the loop ends with "return" on success, or with "throw" when the error must reach the caller.
  for (;;) {
    try {
      // the whole work runs again on every try, so every count and check inside it reads fresh data.
      // safety: a second try never reuses a number from the first try, so a group can never go over its size.
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      // any other error (like "this group is full") is final, so it goes straight to the caller.
      // after the last try, the collision error goes to the caller too.
      // the shared error filter then answers 409 "The server was busy. Please try again".
      if (!isTransactionConflict(error) || attempt >= maxAttempts) {
        throw error;
      }
      // a short pause that grows with each try, plus a small random part.
      // the random part stops two colliding requests from trying again at exactly the same moment.
      await wait(attempt * 20 + Math.floor(Math.random() * 20));
      attempt += 1;
    }
  }
}