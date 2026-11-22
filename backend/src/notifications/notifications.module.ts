// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: the service that saves notifications.
import { NotificationsService } from './notifications.service';

// the notifications module. it holds no routes yet: the bell list and "mark as read" come in week 8.
// other modules (join requests now, sessions and posts later) import it to send notifications.
// the prisma module is global, so it does not need to be imported here.

// "@Module()" tells nestjs that this class is a module.
@Module({
  // providers are the classes that nestjs creates inside this module.
  providers: [NotificationsService],
  // "exports" lets other modules that import this module use the service too.
  exports: [NotificationsService],
})
export class NotificationsModule {}