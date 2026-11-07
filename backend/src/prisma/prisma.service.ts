import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // We inject the ConfigService so we can read environment variables safely.
  constructor(configService: ConfigService) {
    // Read the database URL from the environment.
    const databaseUrl = configService.get<string>('DATABASE_URL');

    // SAFETY: If the URL is missing, stop the app immediately with a clear message.
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing. Please check your .env file.');
    }

    // Create the adapter using the safe URL.
    const adapter = new PrismaPg({ 
      connectionString: databaseUrl 
    });
    
    // Pass it to Prisma.
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}