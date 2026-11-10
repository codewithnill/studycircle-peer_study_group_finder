// imports: the four functions we want to test, from the file next to this one.
import {
  keysToCamelCase,
  keysToSnakeCase,
  toCamelCase,
  toSnakeCase,
} from './case-converter';
 
// "describe" groups tests together under one name. "it" is one single test.
// "expect(...).toBe(...)" says: the result must be exactly this.
describe('case converter', () => {
  describe('toSnakeCase', () => {
    // the main job: camelCase in, snake_case out.
    it('changes camelCase words to snake_case', () => {
      expect(toSnakeCase('maxSize')).toBe('max_size');
      expect(toSnakeCase('userId')).toBe('user_id');
      expect(toSnakeCase('totalPages')).toBe('total_pages');
    });
 
    // words that are already fine must not change.
    it('leaves snake_case and single words alone', () => {
      expect(toSnakeCase('group_id')).toBe('group_id');
      expect(toSnakeCase('title')).toBe('title');
    });
 
    // a run of capitals should become one clean word.
    it('handles a run of capital letters', () => {
      expect(toSnakeCase('HTTPServer')).toBe('http_server');
    });
  });
 
  describe('toCamelCase', () => {
    // the main job: snake_case in, camelCase out.
    it('changes snake_case words to camelCase', () => {
      expect(toCamelCase('max_size')).toBe('maxSize');
      expect(toCamelCase('group_id')).toBe('groupId');
      expect(toCamelCase('total_pages')).toBe('totalPages');
    });
 
    // words that are already fine must not change.
    it('leaves camelCase and single words alone', () => {
      expect(toCamelCase('maxSize')).toBe('maxSize');
      expect(toCamelCase('title')).toBe('title');
    });
  });
 
  describe('keysToSnakeCase', () => {
    // keys deep inside objects and lists must change too.
    it('renames keys in nested objects and lists', () => {
      const input = {
        groupId: 1,
        owner: { firstName: 'Ana', tagList: [{ tagName: 'math' }] },
      };
 
      expect(keysToSnakeCase(input)).toEqual({
        group_id: 1,
        owner: { first_name: 'Ana', tag_list: [{ tag_name: 'math' }] },
      });
    });
 
    // a date must come out as the very same date object.
    it('does not touch dates', () => {
      const when = new Date('2026-11-08T10:00:00Z');
      const result = keysToSnakeCase({ scheduledAt: when }) as {
        scheduled_at: Date;
      };
 
      // "toBe" checks it is the same object, not just an equal one.
      expect(result.scheduled_at).toBe(when);
    });
 
    // values that are not objects pass straight through.
    it('returns numbers, text, and null as they are', () => {
      expect(keysToSnakeCase(null)).toBeNull();
      expect(keysToSnakeCase(5)).toBe(5);
      // text values are never renamed, only keys are.
      expect(keysToSnakeCase('maxSize')).toBe('maxSize');
    });
 
    // a notification payload already uses snake_case keys, so nothing should change.
    it('leaves a snake_case notification payload unchanged', () => {
      const payload = {
        group_id: 12,
        group_title: 'Beginner Data Structures',
        message: 'your request was approved',
        related_id: 5,
      };
 
      expect(keysToSnakeCase(payload)).toEqual(payload);
    });
  });
 
  describe('keysToCamelCase', () => {
    // the main job for incoming request data.
    it('renames keys from snake_case to camelCase', () => {
      expect(keysToCamelCase({ max_size: 5, exam_date: '2026-12-15' })).toEqual(
        { maxSize: 5, examDate: '2026-12-15' },
      );
    });
 
    // safety test: a hacker sends a "__proto__" key inside json.
    it('drops dangerous keys like __proto__', () => {
      // JSON.parse makes "__proto__" a normal key, which is how an attack would arrive.
      const attack = JSON.parse(
        '{"__proto__": {"isAdmin": true}, "max_size": 5}',
      ) as unknown;
 
      const result = keysToCamelCase(attack) as Record<string, unknown>;
 
      // only the safe key survives.
      expect(Object.keys(result)).toEqual(['maxSize']);
      // the result still has the normal object prototype, so nothing was polluted.
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      // a fresh object must not have an "isAdmin" value.
      expect(({} as { isAdmin?: boolean }).isAdmin).toBeUndefined();
    });
  });
});