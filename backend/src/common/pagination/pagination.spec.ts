// imports: the things we want to test, from the file next to this one.
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MAX_PAGE_NUMBER,
  PaginatedResult,
  buildPaginationMeta,
  getPaginationParams,
  paginated,
} from './pagination';
 
describe('pagination helper', () => {
  describe('getPaginationParams', () => {
    // nothing was sent, so the defaults apply.
    it('uses page 1 and limit 10 when nothing is sent', () => {
      expect(getPaginationParams()).toEqual({
        page: 1,
        limit: DEFAULT_PAGE_LIMIT,
        skip: 0,
        take: DEFAULT_PAGE_LIMIT,
      });
      expect(DEFAULT_PAGE_LIMIT).toBe(10);
    });
 
    // skip must jump over the earlier pages.
    it('calculates skip from page and limit', () => {
      expect(getPaginationParams({ page: 3, limit: 20 })).toEqual({
        page: 3,
        limit: 20,
        skip: 40,
        take: 20,
      });
    });
 
    // values from the address bar are text, so text numbers must work.
    it('accepts numbers written as text', () => {
      expect(getPaginationParams({ page: '2', limit: '15' })).toEqual({
        page: 2,
        limit: 15,
        skip: 15,
        take: 15,
      });
    });
 
    // a bigger limit is cut down to 50, not refused.
    it('cuts a big limit down to 50', () => {
      expect(getPaginationParams({ limit: 500 }).limit).toBe(MAX_PAGE_LIMIT);
      expect(MAX_PAGE_LIMIT).toBe(50);
    });
 
    // a smaller page becomes 1.
    it('turns a page below 1 into page 1', () => {
      expect(getPaginationParams({ page: 0 }).page).toBe(1);
      expect(getPaginationParams({ page: -4 }).page).toBe(1);
    });
 
    // a limit below 1 makes no sense, so it gets the default.
    it('uses the default limit when the limit is below 1', () => {
      expect(getPaginationParams({ limit: 0 }).limit).toBe(DEFAULT_PAGE_LIMIT);
      expect(getPaginationParams({ limit: -5 }).limit).toBe(DEFAULT_PAGE_LIMIT);
    });
 
    // words, lists, and other silly input must not crash anything.
    it('uses the defaults for values that are not numbers', () => {
      expect(getPaginationParams({ page: 'abc', limit: 'xyz' })).toEqual({
        page: 1,
        limit: DEFAULT_PAGE_LIMIT,
        skip: 0,
        take: DEFAULT_PAGE_LIMIT,
      });
      // "?page=1&page=2" arrives as a list.
      expect(getPaginationParams({ page: ['1', '2'] }).page).toBe(1);
    });
 
    // safety test: a huge page number must be cut down.
    it('cuts a huge page number down to the cap', () => {
      expect(getPaginationParams({ page: 99999999999 }).page).toBe(
        MAX_PAGE_NUMBER,
      );
    });
  });
 
  describe('buildPaginationMeta', () => {
    // the example from the api shape file: 87 items, 10 per page, 9 pages.
    it('rounds the page count up', () => {
      expect(buildPaginationMeta(1, 10, 87)).toEqual({
        page: 1,
        limit: 10,
        total: 87,
        totalPages: 9,
      });
    });
 
    // an empty list has zero pages.
    it('gives 0 pages when there are no items', () => {
      expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(0);
    });
  });
 
  describe('paginated', () => {
    // the interceptor looks for this exact class, so the helper must return it.
    it('returns a PaginatedResult with the items and the meta', () => {
      const params = getPaginationParams({ page: 1, limit: 2 });
      const result = paginated(['a', 'b'], params, 5);
 
      expect(result).toBeInstanceOf(PaginatedResult);
      expect(result.items).toEqual(['a', 'b']);
      expect(result.meta).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });
  });
});