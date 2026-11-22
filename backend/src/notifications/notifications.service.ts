// import: "Injectable" marks a class so nestjs can create it and hand it to other classes.
import { Injectable } from '@nestjs/common';
// import: "Prisma" gives the type of the client inside a transaction and the json types for the payload column.
import { Prisma } from '../generated/prisma/client';
// import: prismaservice is the one shared database connection. nestjs hands it in.
import { PrismaService } from '../prisma/prisma.service';
// import: the fixed notification words and the payload shape. they are never typed by hand here.
import { NotificationPayload, NotificationType } from '../common/constants/notification-types';

// what a caller hands over to create one notification.
export interface NewNotification {
  // the person who will see the notification in the bell list.
  userId: number;
  // one of the seven fixed words, like "join_request_approved".
  type: NotificationType;
  // the four details: group id, group title, a short sentence, and the related id.
  payload: NotificationPayload;
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// the notification service. it is the one place that saves notifications.
// in week 5 it only saves in-app notifications. the bell list and "mark as read" come in week 8.
// email can plug in here later without changing the features that call it (the plan, section 8, rule 6).
export class NotificationsService {
  // the constructor receives the database connection. "private" also saves it as this.prisma.
  constructor(private readonly prisma: PrismaService) {}

  // saves one notification.
  // "client" is the transaction of the caller, when there is one. the row is then saved together with the action.
  // so a failed approval never leaves behind a notification that says "approved".
  // without a transaction, the normal connection is used.
  async create(
    input: NewNotification,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    // the payload is copied key by key into a plain json object.
    // safety: only the four known keys are saved, so no extra data from the caller can sneak into the column.
    // the keys stay snake_case on purpose, because this object is saved and sent exactly as it is.
    const payload: Prisma.InputJsonObject = {
      group_id: input.payload.group_id,
      group_title: input.payload.group_title,
      message: input.payload.message,
      related_id: input.payload.related_id,
    };

    // one new row. "read_at" stays empty, so the bell count includes it until the person opens it.
    await client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        payload,
      },
    });
  }
}