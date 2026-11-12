// this file builds the database connection used only by the seed script.
// the nest app has its own connection in src/prisma/prisma.service.ts. the seed runs outside
// nest, so it cannot borrow that one. this is the one allowed exception to the rule
// "only prismamodule creates a database connection".

// borrows the postgresql adapter. prisma 7 needs an adapter to talk to postgresql.
import { PrismaPg } from '@prisma/adapter-pg';
// borrows the generated prisma client. it must come from src/generated/prisma, never from @prisma/client.
import { PrismaClient } from '../../src/generated/prisma/client';

// creates one prisma client for the seed script and returns it.
// the caller must call $disconnect() on it when the script ends.
export function createSeedClient(): PrismaClient {
  // read the database link from the environment. seed.ts loads backend/.env before this runs.
  const databaseUrl = process.env['DATABASE_URL'];

  // a missing link means .env was not loaded. stop with a clear message.
  if (!databaseUrl) {
    // safety: the message never prints the link. the link contains the database password.
    throw new Error('DATABASE_URL is missing. check backend/.env.');
  }

  // build the adapter from the link, the same way prisma.service.ts does.
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  // hand the adapter to the client and return it.
  return new PrismaClient({ adapter });
}