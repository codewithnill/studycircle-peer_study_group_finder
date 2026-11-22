// import: the type of the client inside a transaction, so the fake transaction can be passed in.
import { Prisma } from '../generated/prisma/client';
// import: the database connection type. a small fake stands in for it.
import { PrismaService } from '../prisma/prisma.service';
// import: the fixed notification words, so the test never types them by hand.
import { NOTIFICATION_TYPES } from '../common/constants/notification-types';
// import: the service under test and the shape of its input.
import { NewNotification, NotificationsService } from './notifications.service';

// "describe" groups the tests for one thing. here: the notification service.
describe('NotificationsService', () => {
  // a sample notification, used by every test.
  const input: NewNotification = {
    userId: 7,
    type: NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED,
    payload: {
      group_id: 12,
      group_title: 'Graph Theory Prep',
      message: 'Your request to join Graph Theory Prep was approved',
      related_id: 40,
    },
  };

  // the row the database should receive for the sample above.
  const expectedRow = {
    data: {
      userId: 7,
      type: 'join_request_approved',
      payload: {
        group_id: 12,
        group_title: 'Graph Theory Prep',
        message: 'Your request to join Graph Theory Prep was approved',
        related_id: 40,
      },
    },
  };

  // the normal connection's fake "create", kept in its own variable (lint rule "unbound-method").
  let prismaCreate: jest.Mock;
  // the service under test.
  let service: NotificationsService;

  // "beforeEach" runs before every test, so each test starts with clean fakes.
  beforeEach(() => {
    prismaCreate = jest.fn().mockResolvedValue({});
    const prisma = { notification: { create: prismaCreate } } as unknown as PrismaService;
    service = new NotificationsService(prisma);
  });

  // without a transaction, the row is saved through the normal connection.
  it('saves one row through the normal connection when no transaction is given', async () => {
    await service.create(input);

    expect(prismaCreate).toHaveBeenCalledTimes(1);
    expect(prismaCreate).toHaveBeenCalledWith(expectedRow);
  });

  // with a transaction, the row must be saved inside it, so it rolls back together with the action.
  it('saves the row inside the given transaction, never through the normal connection', async () => {
    const txCreate = jest.fn().mockResolvedValue({});
    const tx = { notification: { create: txCreate } } as unknown as Prisma.TransactionClient;

    await service.create(input, tx);

    expect(txCreate).toHaveBeenCalledWith(expectedRow);
    expect(prismaCreate).not.toHaveBeenCalled();
  });

  // safety: an extra key in the payload must never reach the database.
  it('saves only the four known payload keys', async () => {
    const withExtra = {
      ...input,
      payload: { ...input.payload, secret: 'should not be saved' },
    } as NewNotification;

    await service.create(withExtra);

    expect(prismaCreate).toHaveBeenCalledWith(expectedRow);
  });
});