import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// We import PrismaClient from the generated folder. 
// Prisma 7 generates the client inside the src folder by default so TypeScript can find it easily.
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // This runs once when the NestJS application starts.
  async onModuleInit() {
    // This actually connects to the database.
    await this.$connect();
  }

  // This runs when the NestJS application is shut down.
  async onModuleDestroy() {
    // This safely closes the database connection.
    await this.$disconnect();
  }
}