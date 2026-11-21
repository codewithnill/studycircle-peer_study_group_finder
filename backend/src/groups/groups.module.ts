// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: the controller with the group routes.
import { GroupsController } from './groups.controller';
// import: the service that creates, reads, and edits groups.
import { GroupsService } from './groups.service';

// the groups module. this is the heart of the project: finding and managing study groups.
// it holds creating, viewing, and editing groups now (week 3).
// search comes in week 4, and join requests, members, and the leadership rules in week 5.
// the prisma module is global, so it does not need to be imported here.

// "@Module()" tells nestjs that this class is a module.
@Module({
  // controllers hold routes. nestjs reads their decorators and connects the addresses.
  controllers: [GroupsController],
  // providers are the classes that nestjs creates inside this module.
  providers: [GroupsService],
})
export class GroupsModule {}