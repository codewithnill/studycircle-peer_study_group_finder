// imports from nestjs.
// "BadRequestException" is the error that gives a 400 status.
// "ValidationPipe" is the ready-made pipe that checks input using class-validator rules.
import { BadRequestException, ValidationPipe } from '@nestjs/common';
// our helper that turns camelCase words into snake_case.
import { toSnakeCase } from '../utils/case-converter';

// the part of a class-validator error that we need.
// we describe it ourselves, so this file does not depend on the class-validator types.
interface ValidationErrorLike {
  // the name of the field that failed, like "maxSize".
  property: string;
  // the failed rules and their messages.
  constraints?: Record<string, string>;
  // errors for fields inside this field (for objects and lists).
  children?: ValidationErrorLike[];
}

// one item in the "errors" list of the reply.
export interface ValidationErrorItem {
  field: string;
  message: string;
}

// makes a piece of text safe to use inside a regular expression.
// it puts a backslash before characters that have a special meaning there.
function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// turns the nested list of class-validator errors into one flat list.
// field names become snake_case, because that is what the client sent.
// "parentPath" is used for fields inside objects, so we get names like "address.street_name".
export function flattenValidationErrors(
  errors: ValidationErrorLike[],
  parentPath = '',
): ValidationErrorItem[] {
  // the flat list we will fill.
  const items: ValidationErrorItem[] = [];

  for (const error of errors) {
    // the snake_case name of this field.
    const snakeName = toSnakeCase(error.property);
    // add the parent path in front, if there is one.
    const field = parentPath === '' ? snakeName : `${parentPath}.${snakeName}`;

    if (error.constraints) {
      // the messages from class-validator say "maxSize must be ...".
      // we swap the camelCase name for the snake_case name, so the message matches the field.
      // "\b" means a word edge, so the name "id" is not changed inside the word "valid".
      const pattern = new RegExp(`\\b${escapeForRegex(error.property)}\\b`, 'g');

      for (const message of Object.values(error.constraints)) {
        items.push({ field, message: message.replace(pattern, () => snakeName) });
      }
    }

    // go deeper for fields inside this field.
    if (error.children && error.children.length > 0) {
      items.push(...flattenValidationErrors(error.children, field));
    }
  }

  return items;
}

// builds the one validation pipe the whole app uses.
// we call this function in main.ts.
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // remove any field that the dto does not list.
    // safety: this stops "mass assignment", where someone adds a field like role: "admin".
    whitelist: true,
    // refuse the request when an unlisted field is sent, instead of dropping it quietly.
    // a dto for a list route must therefore list "page" and "limit" too.
    forbidNonWhitelisted: true,
    // give the controller a real dto object (not a plain one) after the checks pass.
    transform: true,
    // safety: do not keep the full input object or the typed value inside error objects.
    // a failed password check must never carry the password around.
    validationError: { target: false, value: false },
    // build the error in the shape from section 3 of the api shape rules.
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: 'Validation failed',
        errors: flattenValidationErrors(errors),
      }),
  });
}