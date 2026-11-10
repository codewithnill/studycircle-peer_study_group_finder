// imports from nestjs.
// "ArgumentsHost" gives us access to the current request and reply.
// "Catch" is a decorator that tells nestjs "this class handles errors".
// "ExceptionFilter" is the shape every filter must follow.
// "HttpException" is the base class of nestjs errors like NotFoundException.
// "Logger" writes messages to the server log (your terminal). the client never sees them.
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

// one item in the "errors" list. it says which field was wrong and why.
interface ErrorItem {
  field: string;
  message: string;
}

// the error reply exactly as the client receives it (section 3 of the api shape rules).
// the keys are written in snake_case here, because errors do not pass through the interceptor.
interface ErrorBody {
  status_code: number;
  message: string;
  errors: ErrorItem[];
}

// the smallest part of the reply object that we need.
// we describe it ourselves instead of importing express types.
// this keeps the file simple and makes it easy to test.
interface ReplyLike {
  status(code: number): { json(body: unknown): unknown };
}

// the message for any server problem.
// safety: it never says what really went wrong, so we never leak stack traces,
// sql errors, file paths, or the database link.
const GENERIC_SERVER_MESSAGE = 'Something went wrong on our side';

// short, friendly messages for common client errors, used when nothing better exists.
const DEFAULT_MESSAGES: Record<number, string | undefined> = {
  400: 'The request could not be understood',
  401: 'You are not logged in',
  403: 'You are not allowed to do this',
  404: 'Not found',
  409: 'This action conflicts with the current data',
  413: 'The request is too big',
  429: 'Too many requests. Please try again later',
};

// the database error codes we turn into friendly replies.
// the full list is in the prisma error reference.
// a service should still catch the cases it knows well
// (for example a second pending join request) and give a more exact message.
const PRISMA_ERROR_MAP: Record<
  string,
  { status: number; message: string } | undefined
> = {
  // a unique rule was broken (for example a duplicate email).
  P2002: { status: 409, message: 'This value is already in use' },
  // a foreign key rule was broken (for example deleting something that is still used).
  P2003: { status: 409, message: 'This item is still linked to other data' },
  // the row we wanted to change or delete does not exist.
  P2025: { status: 404, message: 'Not found' },
  // two database transactions collided. trying again usually works.
  P2034: { status: 409, message: 'The server was busy. Please try again' },
};

// gives a safe default message for a status code.
function defaultMessage(status: number): string {
  // any 5xx status always gets the generic server message.
  if (status >= 500) {
    return GENERIC_SERVER_MESSAGE;
  }
  return DEFAULT_MESSAGES[status] ?? 'The request could not be completed';
}

// checks that a value looks like { field: text, message: text }.
function isErrorItem(value: unknown): value is ErrorItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as { field?: unknown; message?: unknown };
  return typeof item.field === 'string' && typeof item.message === 'string';
}

// finds the message inside the reply that a nestjs error carries.
function pickMessage(response: string | object, status: number): string {
  // the error was made with just a text, like new NotFoundException('Group not found').
  if (typeof response === 'string') {
    return response;
  }
  const message = (response as { message?: unknown }).message;
  // a normal text message.
  if (typeof message === 'string') {
    return message;
  }
  // a list of messages means input checking failed.
  if (Array.isArray(message)) {
    return 'Validation failed';
  }
  return defaultMessage(status);
}

// finds the "errors" list inside the reply, and keeps only well-formed items.
function pickErrors(response: string | object): ErrorItem[] {
  if (typeof response === 'string') {
    return [];
  }
  const errors = (response as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors
    .filter(isErrorItem)
    .map((item) => ({ field: item.field, message: item.message }));
}

// finds the code of a known prisma error, or gives back undefined.
// we check the error's name instead of importing the prisma error class,
// so this file does not depend on the generated client.
function getPrismaCode(exception: unknown): string | undefined {
  if (
    !(exception instanceof Error) ||
    exception.name !== 'PrismaClientKnownRequestError'
  ) {
    return undefined;
  }
  const code = (exception as { code?: unknown }).code;
  // prisma codes look like P2002: the letter P and four digits.
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
}

// finds the status of client errors that are not nestjs errors.
// example: the body reader throws a 400 when the json is broken.
// only 4xx codes count here. anything else is treated as a server problem.
function getClientErrorStatus(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }
  const { status, statusCode } = exception as {
    status?: unknown;
    statusCode?: unknown;
  };
  const value = typeof status === 'number' ? status : statusCode;
  return typeof value === 'number' && value >= 400 && value < 500
    ? value
    : undefined;
}

// builds the final status and body in one place.
function buildReply(
  status: number,
  message: string,
  errors: ErrorItem[] = [],
): { status: number; body: ErrorBody } {
  return { status, body: { status_code: status, message, errors } };
}

// the exception filter.
// it catches every error in the app and sends the same three-key reply:
// status_code, message, and errors (section 3 of the api shape rules).
// "@Catch()" with nothing inside the brackets means "catch every kind of error".
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // a logger named after this class, so log lines show where they came from.
  private readonly logger = new Logger(AllExceptionsFilter.name);

  // nestjs calls this method whenever an error is thrown and nobody else handled it.
  catch(exception: unknown, host: ArgumentsHost): void {
    // get the reply object, so we can send our answer.
    const reply = host.switchToHttp().getResponse<ReplyLike>();

    // work out the status and the body for this error.
    const { status, body } = this.describe(exception);

    // send it.
    reply.status(status).json(body);
  }

  // turns any error into a safe status and body.
  private describe(exception: unknown): { status: number; body: ErrorBody } {
    // case 1: a nestjs error (NotFoundException, ConflictException, our validation error, ...).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // server problems never show their own message to the client.
      if (status >= 500) {
        this.logger.error(`${status} ${exception.message}`, exception.stack);
        return buildReply(status, GENERIC_SERVER_MESSAGE);
      }

      // client problems keep their message and their errors list.
      const response = exception.getResponse();
      return buildReply(
        status,
        pickMessage(response, status),
        pickErrors(response),
      );
    }

    // case 2: a known database error. turn it into a friendly reply.
    const prismaCode = getPrismaCode(exception);
    if (prismaCode !== undefined) {
      const mapped = PRISMA_ERROR_MAP[prismaCode];
      if (mapped) {
        return buildReply(mapped.status, mapped.message);
      }
    }

    // case 3: a client error that is not a nestjs error, like broken json.
    const clientStatus = getClientErrorStatus(exception);
    if (clientStatus !== undefined) {
      return buildReply(clientStatus, defaultMessage(clientStatus));
    }

    // case 4: anything else is a bug or an unknown failure.
    // the details go to the server log only. the client gets the generic message.
    // safety: never put the real error text in the reply.
    this.logger.error(
      exception instanceof Error ? exception.message : 'Unknown error',
      exception instanceof Error ? exception.stack : undefined,
    );
    return buildReply(500, GENERIC_SERVER_MESSAGE);
  }
}