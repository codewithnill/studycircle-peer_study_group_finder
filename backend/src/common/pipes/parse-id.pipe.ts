// imports: "NotFoundException" is the 404 error. "PipeTransform" is the shape every nestjs pipe follows.
import { NotFoundException, PipeTransform } from '@nestjs/common';
// import: the largest id an integer column can hold.
import { MAX_INT_ID } from '../constants';

// a whole number written as text, with no sign, no dot, no spaces, and no leading zero, for example "12".
const ID_PATTERN = /^[1-9][0-9]*$/;

// turns an id from the address into a number that is safe to give to prisma.
// any value that cannot be a real row id gives 404 with the message the route chose.
// why 404 and not 400: "abc" or a huge number can never point to a row, so "not found" is the honest answer,
// and it keeps the same reply as an unknown id. it also stops a number bigger than the integer column
// from reaching prisma, which would throw a 500 error.
// note: the global validation pipe runs first, and it has "transform: true".
// for a parameter declared as "number", it already turns the text "12" into the number 12 (and "abc" into NaN).
// so this pipe accepts both: text (when it is used on its own, as in the unit tests) and a number (inside the real app).
// a route uses it like this: @Param('id', new ParseIdPipe(PROFILE_NOT_FOUND_MESSAGE)) id: number.
// it is made with "new" and a message, so it does not need @Injectable() or the nestjs container.
export class ParseIdPipe implements PipeTransform<string | number, number> {
  // the constructor saves the message for the 404 reply. "private readonly" also stores it as this.notFoundMessage.
  constructor(private readonly notFoundMessage: string) {}

  // checks the value and gives back the id as a number, or throws the 404 error.
  transform(value: string | number): number {
    const id = this.toId(value);

    // null means the value can never be a row id.
    if (id === null) {
      throw new NotFoundException(this.notFoundMessage);
    }

    return id;
  }

  // turns text or a number into a safe id. gives null for anything else.
  private toId(value: unknown): number | null {
    // text must hold only digits, with no leading zero. then it is checked like a number.
    if (typeof value === 'string') {
      return ID_PATTERN.test(value) ? this.inRange(Number(value)) : null;
    }

    // a number that the global validation pipe already made from the text.
    if (typeof value === 'number') {
      return this.inRange(value);
    }

    // any other kind of value (for example undefined) can never be an id.
    return null;
  }

  // keeps a number only when it is a whole number from 1 to the integer column limit.
  // Number.isInteger() is false for NaN, for Infinity, and for a decimal like 1.5.
  // safety: a number above the limit would make prisma throw, so it is refused here first.
  private inRange(id: number): number | null {
    return Number.isInteger(id) && id >= 1 && id <= MAX_INT_ID ? id : null;
  }
}