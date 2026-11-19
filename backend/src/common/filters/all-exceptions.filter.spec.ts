// imports from nestjs.
// "ArgumentsHost" is the object that gives a filter access to the reply.
// the three exceptions are real nestjs errors that the tests throw.
// "HttpException" makes an error with any status, for example a 500 or a 429.
// "Logger" is spied on, so test runs do not fill the terminal with error logs.
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
// imports the real error that the rate limit guard throws, so the test uses the same error as the app.
import { ThrottlerException } from '@nestjs/throttler';
// the class under test.
import { AllExceptionsFilter } from './all-exceptions.filter';

// the plain sentence for a 429. it is written out here on purpose, so a changed sentence makes a test fail.
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests. Please try again later';

// a helper for the tests.
// it builds a fake "host" and gives back the fake functions the filter may call,
// so a test can check what the filter sent.
function createHost() {
  // "json" is the function that sends the body.
  const json = jest.fn();
  // "status" must return an object that has "json", just like a real reply.
  const status = jest.fn().mockReturnValue({ json });
  // the header functions of a real reply. the filter must never call them.
  const setHeader = jest.fn();
  const removeHeader = jest.fn();
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status, setHeader, removeHeader }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json, setHeader, removeHeader };
}

// makes an error that looks like a known prisma error (same name, and a code).
function makePrismaError(code: string): Error {
  const error = new Error('Unique constraint failed on the fields: (`email`)');
  error.name = 'PrismaClientKnownRequestError';
  return Object.assign(error, { code });
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    // hide the real error logs while tests run, but still allow a check that they were called.
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    // put the real logger back after every test.
    jest.restoreAllMocks();
  });

  // a normal nestjs error keeps its status and its message. the errors list is empty.
  it('keeps the message of a client error', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('Group not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      status_code: 404,
      message: 'Group not found',
      errors: [],
    });
  });

  // a conflict, like the duplicate pending request message from the api shape file.
  it('keeps the message of a conflict error', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new ConflictException('You already have a pending request for this group'),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      status_code: 409,
      message: 'You already have a pending request for this group',
      errors: [],
    });
  });

  // the validation error carries the errors list. the filter must pass it on.
  it('passes the errors list of a validation error', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException({
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'email must be a valid email' }],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      status_code: 400,
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'email must be a valid email' }],
    });
  });

  // safety test: a 500 from nestjs must not show its own message.
  it('hides the message of a server error', () => {
    const { host, status, json } = createHost();

    filter.catch(new HttpException('database password is abc', 500), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      status_code: 500,
      message: 'Something went wrong on our side',
      errors: [],
    });
  });

  // safety test: an unknown error must never leak its text to the client.
  it('hides the details of an unknown error and logs them', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('select * from users where password = 1234'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      status_code: 500,
      message: 'Something went wrong on our side',
      errors: [],
    });
    // the details went to the server log instead.
    expect(errorLog).toHaveBeenCalled();
  });

  // a duplicate value in the database becomes a friendly 409.
  it('turns prisma P2002 into a friendly 409', () => {
    const { host, status, json } = createHost();

    filter.catch(makePrismaError('P2002'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      status_code: 409,
      message: 'This value is already in use',
      errors: [],
    });
  });

  // the other mapped codes.
  it('maps P2025 to 404, P2003 to 409, and P2034 to 409', () => {
    const cases: Array<[string, number]> = [
      ['P2025', 404],
      ['P2003', 409],
      ['P2034', 409],
    ];

    for (const [code, expectedStatus] of cases) {
      const { host, status } = createHost();

      filter.catch(makePrismaError(code), host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
    }
  });

  // a prisma code the filter does not know is treated as a server problem.
  it('treats an unknown prisma code as a 500', () => {
    const { host, status } = createHost();

    filter.catch(makePrismaError('P2999'), host);

    expect(status).toHaveBeenCalledWith(500);
  });

  // broken json makes the body reader throw an error that is not a nestjs error.
  it('turns a body reader error into a friendly 400', () => {
    const { host, status, json } = createHost();

    filter.catch(
      { status: 400, type: 'entity.parse.failed', message: 'Unexpected token }' },
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      status_code: 400,
      message: 'The request could not be understood',
      errors: [],
    });
  });

  // the real rate limit error carries the text "ThrottlerException: Too Many Requests".
  // the filter must replace it with the plain sentence (tracker item 53).
  it('turns the throttler error into a plain 429 sentence', () => {
    const { host, status, json } = createHost();

    filter.catch(new ThrottlerException(), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      status_code: 429,
      message: TOO_MANY_REQUESTS_MESSAGE,
      errors: [],
    });
  });

  // any 429 gets the same sentence, so later rate limits (join requests, uploads, chat) look the same.
  it('uses the plain sentence for any 429, even with a custom text', () => {
    const { host, status, json } = createHost();

    filter.catch(new HttpException('ThrottlerException: custom text', 429), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      status_code: 429,
      message: TOO_MANY_REQUESTS_MESSAGE,
      errors: [],
    });
  });

  // the throttler guard puts the Retry-After header on the reply before the error reaches the filter.
  // this test proves the filter never sets or removes a header, so that header survives.
  it('never touches the reply headers, so Retry-After stays', () => {
    const { host, setHeader, removeHeader } = createHost();

    filter.catch(new ThrottlerException(), host);

    expect(setHeader).not.toHaveBeenCalled();
    expect(removeHeader).not.toHaveBeenCalled();
  });
});