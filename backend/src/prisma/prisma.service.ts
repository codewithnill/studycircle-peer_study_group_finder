// We import Injectable to let NestJS manage this class.
// OnModuleInit and OnModuleDestroy let us run code when the app starts and stops.
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// We import ConfigService to safely read environment variables.
import { ConfigService } from '@nestjs/config';
// We import the PostgreSQL adapter that Prisma 7 requires.
import { PrismaPg } from '@prisma/adapter-pg';
// We import the generated PrismaClient.
import { PrismaClient } from '../generated/prisma/client';

// @Injectable() is a decorator that marks this class as a service that can be injected into other parts of the app.
@Injectable()
// This class extends PrismaClient so it has all the database methods.
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // The constructor is called when the service is created by NestJS.
  // We use it to set up the database connection.
  constructor(configService: ConfigService) {
    // We get the DATABASE_URL from the .env file using ConfigService.
    const databaseUrl = configService.get<string>('DATABASE_URL');

    // SAFETY: Never print or log the databaseUrl. It contains the database password.
    // If the URL is missing, the app should stop immediately with a clear error.
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing. Please check your .env file.');
    }

    // We create the Prisma adapter using the safe URL.
    const adapter = new PrismaPg({ 
      connectionString: databaseUrl 
    });
    
    // We call super() to pass the adapter to the parent class (PrismaClient).
    super({ adapter });
  }

  // This method runs once when the application starts.
  async onModuleInit() {
    // We connect to the database.
    await this.$connect();
  }

  // This method runs when the application shuts down.
  async onModuleDestroy() {
    // We safely close the database connection.
    await this.$disconnect();
  }
}