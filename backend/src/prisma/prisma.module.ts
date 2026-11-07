// We import Module and Global from NestJS. 
// Module lets us create a feature module. Global makes this module available everywhere without importing it repeatedly.
import { Module, Global } from '@nestjs/common';
// We import our PrismaService so we can provide it to the app.
import { PrismaService } from './prisma.service';

// @Global() is a decorator that tells NestJS: "Make the providers in this module available to every other module automatically."
// SAFETY: Only this module creates the database connection. No other module may create its own PrismaClient.
@Global()
// @Module() is a decorator that groups related things together. Here we group the PrismaService.
@Module({
  // Providers are the services that NestJS will create and manage.
  providers: [PrismaService],
  // Exports means other modules can use this service.
  exports: [PrismaService],
})
// This class is the actual module. It is exported so AppModule can import it.
export class PrismaModule {}