// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: the notifications module, so the join requests service can use the notification service.
import { NotificationsModule } from '../notifications/notifications.module';
// import: the controller with the join request routes.
import { JoinRequestsController } from './join-requests.controller';
// import: the service with the join request rules.
import { JoinRequestsService } from './join-requests.service';

// the join requests module. it holds sending, cancelling, listing, approving, and rejecting join requests (week 5).
// it is its own module, because join requests have their own rules, routes, and tests (single responsibility).
// the prisma module is global, so it does not need to be imported here.

// "@Module()" tells nestjs that this class is a module.
@Module({
  // "imports" brings in other modules whose exported services this module needs.
  imports: [NotificationsModule],
  // controllers hold routes. nestjs reads their decorators and connects the addresses.
  controllers: [JoinRequestsController],
  // providers are the classes that nestjs creates inside this module.
  providers: [JoinRequestsService],
})
export class JoinRequestsModule {}