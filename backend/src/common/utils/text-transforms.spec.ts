// import: the type of the input object, so the fake inputs below have the right shape.
import type { TransformFnParams } from 'class-transformer';
// import: the two helpers under test.
import { trimText, trimToNull } from './text-transforms';

// builds the smallest input object that the helpers read.
// the helpers use only "value", so the other parts are left out, and the cast tells typescript this is on purpose.
const input = (value: unknown): TransformFnParams => ({ value }) as TransformFnParams;

// a group of tests for the shared text helpers.
describe('text transforms', () => {
  // tests for the helper used on required text.
  describe('trimText', () => {
    it('removes spaces at both ends', () => {
      expect(trimText(input('  Ana  '))).toBe('Ana');
    });

    // an empty result must stay "", so the required check (@IsNotEmpty) can refuse it.
    it('keeps a text of only spaces as an empty text', () => {
      expect(trimText(input('   '))).toBe('');
    });

    // a wrong kind of value must reach the checks unchanged, so they can give a clear error.
    it('passes a value that is not text through unchanged', () => {
      expect(trimText(input(5))).toBe(5);
      expect(trimText(input(null))).toBeNull();
    });
  });

  // tests for the helper used on optional text that may be cleared.
  describe('trimToNull', () => {
    it('removes spaces at both ends', () => {
      expect(trimToNull(input('  CSE '))).toBe('CSE');
    });

    // an html form sends "" for an empty box. it must be saved as null.
    it('turns an empty text into null', () => {
      expect(trimToNull(input(''))).toBeNull();
    });

    it('turns a text of only spaces into null', () => {
      expect(trimToNull(input('   '))).toBeNull();
    });

    // null means "clear this field", and undefined means "do not change this field". both must stay as they are.
    it('keeps null and undefined as they are', () => {
      expect(trimToNull(input(null))).toBeNull();
      expect(trimToNull(input(undefined))).toBeUndefined();
    });

    // a number must reach @IsString() unchanged, so the request is refused with a clear field error.
    it('passes a number through unchanged', () => {
      expect(trimToNull(input(5))).toBe(5);
    });
  });
});