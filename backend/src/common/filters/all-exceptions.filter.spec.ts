// imports from nestjs.
// "ArgumentsHost" is the object that gives a filter access to the reply.
// the three exceptions are real nestjs errors we throw in the tests.
// "HttpException" lets us make a 500 error on purpose.
// "Logger" is spied on, so test runs do not fill the terminal with error logs.
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
// the class we are testing.
import { AllExceptionsFilter } from './all-exceptions.filter';

// a helper for the tests.
// it builds a fake "host" and gives back the two fake functions the filter calls,
// so we can check what the filter sent.
function createHost() {
  // "json" is the function that sends the body.
  const json = jest.fn();
  // "status" must return an object that has "json", just like a real reply.
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
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
    // hide the real error logs while tests run, but still let us check they were called.
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

  // a prisma code we do not know is treated as a server problem.
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
});