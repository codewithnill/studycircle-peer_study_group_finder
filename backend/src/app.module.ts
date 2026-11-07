// We import Module from NestJS to define the root module of the app.
import { Module } from '@nestjs/common';
// We import ConfigModule to load the .env file automatically.
import { ConfigModule } from '@nestjs/config';
// We import our controllers and services.
import { AppController } from './app.controller';
import { AppService } from './app.service';
// We import our custom Prisma module.
import { PrismaModule } from './prisma/prisma.module';

// @Module() is the decorator that tells NestJS this is a module.
@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }) loads the .env file and makes the variables available everywhere.
    // SAFETY: The .env file holds secrets (like passwords) and must never be committed to Git.
    ConfigModule.forRoot({ isGlobal: true }),
    // We add our PrismaModule to the imports so the database is available.
    PrismaModule,
  ],
  // Controllers handle incoming HTTP requests.
  controllers: [AppController],
  // Providers are the services used by the controllers.
  providers: [AppService],
})
// This is the root module of the application.
export class AppModule {}