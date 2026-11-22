// imports "Module" from nestjs to define the root module of the app.
import { Module } from '@nestjs/common';
// imports "ConfigModule" to load the .env file automatically.
import { ConfigModule } from '@nestjs/config';
// imports "ThrottlerModule" to limit how many requests one address can send. this is the rate limit.
import { ThrottlerModule } from '@nestjs/throttler';
// imports the starter controller and service.
import { AppController } from './app.controller';
import { AppService } from './app.service';
// imports the custom prisma module, which owns the one database connection.
import { PrismaModule } from './prisma/prisma.module';
// imports the six feature modules. each one owns one part of the project.
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { GroupsModule } from './groups/groups.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';
// imports the lookups module, which gives the lists of subjects and levels for dropdowns.
import { LookupsModule } from './lookups/lookups.module';

// @Module() is the decorator that tells nestjs this is a module.
@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }) loads the .env file and makes the variables available everywhere.
    // safety: the .env file holds secrets such as the database password. never commit it.
    // only .env.example (with fake values) is allowed in git.
    ConfigModule.forRoot({ isGlobal: true }),
    // the default rate limit for every route: at most 100 requests per minute from one address.
    // "ttl" is the length of the time window in milliseconds. "limit" is how many requests are allowed inside it.
    // routes with their own @Throttle() mark (register, login, refresh) use their own numbers instead.
    // this module is global, so the throttler guard can be used in other modules without importing it again.
    // safety: the counts are kept in the server's memory. they reset when the server restarts and are not shared between servers.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // adds the prisma module to the imports so the database is available.
    PrismaModule,
    // the six feature modules. they get filled in week by week.
    AuthModule,
    UsersModule,
    GroupsModule,
    SessionsModule,
    ChatModule,
    AdminModule,
    // the shared lists of subjects and levels. groups and profiles both use them.
    LookupsModule,
  ],
  // controllers handle incoming http requests.
  controllers: [AppController],
  // providers are the services used by the controllers.
  providers: [AppService],
})
// this is the root module of the application.
export class AppModule {}