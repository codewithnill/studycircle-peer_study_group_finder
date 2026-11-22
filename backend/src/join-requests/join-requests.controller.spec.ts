// import: the type of the logged-in person, so a small fake person can be made.
import { AuthUser } from '../auth/decorators/current-user.decorator';
// import: the controller under test and the service type. a small fake stands in for the service.
import { JoinRequestsController } from './join-requests.controller';
import { JoinRequestsService } from './join-requests.service';

// "describe" groups the tests for one thing. here: the join requests controller.
// the controller is thin, so the tests only check that each route hands the right values to the service.
describe('JoinRequestsController', () => {
  // the logged-in person. only the id is used by this controller.
  const user = { userId: 7 } as AuthUser;

  // each fake service function in its own variable (lint rule "unbound-method").
  let sendRequest: jest.Mock;
  let listGroupRequests: jest.Mock;
  let listMyRequests: jest.Mock;
  let approveRequest: jest.Mock;
  let rejectRequest: jest.Mock;
  let cancelRequest: jest.Mock;
  // the controller under test.
  let controller: JoinRequestsController;

  // "beforeEach" runs before every test, so each test starts with clean fakes.
  beforeEach(() => {
    sendRequest = jest.fn().mockResolvedValue('sent');
    listGroupRequests = jest.fn().mockResolvedValue('group list');
    listMyRequests = jest.fn().mockResolvedValue('my list');
    approveRequest = jest.fn().mockResolvedValue('approved');
    rejectRequest = jest.fn().mockResolvedValue('rejected');
    cancelRequest = jest.fn().mockResolvedValue('cancelled');
    const service = {
      sendRequest,
      listGroupRequests,
      listMyRequests,
      approveRequest,
      rejectRequest,
      cancelRequest,
    } as unknown as JoinRequestsService;
    controller = new JoinRequestsController(service);
  });

  // safety: in every route, the person's id comes from the login, never from the body or the address.
  it('sends a request with the group id, the logged-in id, and the body', async () => {
    await expect(controller.sendRequest(user, 12, { message: 'Hi' })).resolves.toBe('sent');
    expect(sendRequest).toHaveBeenCalledWith(12, 7, { message: 'Hi' });
  });

  it('lists the group requests with the group id, the logged-in id, and the page query', async () => {
    await expect(controller.listGroupRequests(user, 12, { page: '2' })).resolves.toBe('group list');
    expect(listGroupRequests).toHaveBeenCalledWith(12, 7, { page: '2' });
  });

  it('lists the student own requests with the logged-in id and the page query', async () => {
    await expect(controller.listMyRequests(user, {})).resolves.toBe('my list');
    expect(listMyRequests).toHaveBeenCalledWith(7, {});
  });

  it('approves with the request id and the logged-in id', async () => {
    await expect(controller.approveRequest(user, 40)).resolves.toBe('approved');
    expect(approveRequest).toHaveBeenCalledWith(40, 7);
  });

  it('rejects with the request id, the logged-in id, and the reason', async () => {
    await expect(controller.rejectRequest(user, 40, { reason: 'Too late' })).resolves.toBe('rejected');
    expect(rejectRequest).toHaveBeenCalledWith(40, 7, { reason: 'Too late' });
  });

  it('cancels with the request id and the logged-in id', async () => {
    await expect(controller.cancelRequest(user, 40)).resolves.toBe('cancelled');
    expect(cancelRequest).toHaveBeenCalledWith(40, 7);
  });
});