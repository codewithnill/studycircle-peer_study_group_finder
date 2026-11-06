import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// We import the PostgreSQL adapter. Prisma 7 requires this to actually talk to the database.
import { PrismaPg } from '@prisma/adapter-pg';
// We import the standard PrismaClient from the node_modules folder.
import { PrismaClient } from '@prisma/client';

// @Injectable() tells NestJS that this class can be injected into other parts of the app.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // The constructor runs when this service is created.
  constructor() {
    // SAFETY: We read the DATABASE_URL from the .env file. 
    // This is why we never hardcode passwords in the source code.
    const adapter = new PrismaPg({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    // Prisma 7 requires us to pass the adapter to the parent class (PrismaClient).
    super({ adapter });
  }

  // This method is called by NestJS once when the application starts.
  async onModuleInit() {
    // This actually opens the connection to PostgreSQL.
    await this.$connect();
  }

  // This method is called by NestJS when the application shuts down.
  async onModuleDestroy() {
    // This safely closes the database connection.
    await this.$disconnect();
  }
}