// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: "ConfigModule" lets nestjs read the .env file. nestjs does not read it by itself.
import { ConfigModule } from '@nestjs/config';
// imports: the starter controller and service that nest created for us (the "hello world" route).
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import: the global module that owns the one database connection.
import { PrismaModule } from './prisma/prisma.module';
// new: imports of the six feature modules.
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { GroupsModule } from './groups/groups.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';

// the main module. it joins every other module into one app.
// "@Module({...})" tells nestjs which modules, controllers, and services belong here.
@Module({
  // "imports" lists the other modules this module uses.
  imports: [
    // loads the .env file. "isGlobal: true" means every module can read the settings.
    ConfigModule.forRoot({ isGlobal: true }),
    // the one database connection. it is global, so other modules just ask for PrismaService.
    PrismaModule,
    // new: the six feature modules. each one owns one part of the project.
    AuthModule,
    UsersModule,
    GroupsModule,
    SessionsModule,
    ChatModule,
    AdminModule,
  ],
  // the starter "hello world" controller. we keep it for now.
  controllers: [AppController],
  // the starter service that the controller uses.
  providers: [AppService],
})
export class AppModule {}