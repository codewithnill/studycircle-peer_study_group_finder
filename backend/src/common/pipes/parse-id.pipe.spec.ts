// import: "NotFoundException" is the 404 error the pipe throws.
import { NotFoundException } from '@nestjs/common';
// import: the largest id an integer column can hold.
import { MAX_INT_ID } from '../constants';
// import: the pipe under test.
import { ParseIdPipe } from './parse-id.pipe';

// a made-up message for these tests, so the test proves the pipe uses the message it was given.
const TEST_MESSAGE = 'Test item does not exist';

// a group of tests for the safe id pipe.
describe('ParseIdPipe', () => {
  // a fresh pipe with the test message.
  const pipe = new ParseIdPipe(TEST_MESSAGE);

  it('gives a number for a normal id', () => {
    expect(pipe.transform('12')).toBe(12);
  });

  it('accepts the largest id an integer column can hold', () => {
    expect(pipe.transform(String(MAX_INT_ID))).toBe(MAX_INT_ID);
  });

  // every value that can never be a row id gives 404 with the given message.
  it('gives 404 with the given message for a value with the wrong shape', () => {
    for (const value of ['0', '-1', 'abc', '1.5', '007', '', ' 5', '1e3', 'me']) {
      expect(() => pipe.transform(value)).toThrow(new NotFoundException(TEST_MESSAGE));
    }
  });

  // safety: a number above the column limit would make prisma throw a 500 error.
  it('gives 404 for an id bigger than the integer limit', () => {
    expect(() => pipe.transform(String(MAX_INT_ID + 1))).toThrow(NotFoundException);
    expect(() => pipe.transform('99999999999999999999')).toThrow(NotFoundException);
  });

  // inside the real app, the global validation pipe has already turned the text into a number.
  // this test copies that situation, which the first version of the pipe missed.
  it('accepts a number that the global validation pipe already made from the text', () => {
    expect(pipe.transform(12)).toBe(12);
    expect(pipe.transform(MAX_INT_ID)).toBe(MAX_INT_ID);
  });

  // a converted value that can never be an id still gives 404, never a server error.
  // NaN is what the global pipe makes from a word like "abc".
  it('gives 404 for a converted number that cannot be an id', () => {
    for (const value of [Number.NaN, 0, -1, 1.5, MAX_INT_ID + 1, Number.POSITIVE_INFINITY]) {
      expect(() => pipe.transform(value)).toThrow(new NotFoundException(TEST_MESSAGE));
    }
  });
});