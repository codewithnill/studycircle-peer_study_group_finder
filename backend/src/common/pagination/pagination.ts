// this file holds the paging helper.
// it follows section 4 of the api shape rules: default limit 10, biggest limit 50, page starts at 1.
// search, the users table, the groups table, reports, and notifications will all use it.
// the chat history uses a different style (a cursor), and it comes later with chat.
 
// how many items a page holds when the client does not say.
export const DEFAULT_PAGE_LIMIT = 10;
 
// the most items one page can hold. a bigger number is cut down to this.
export const MAX_PAGE_LIMIT = 50;
 
// the biggest page number we accept.
// safety: a huge page number makes a huge "skip" value, and the database refuses it with an error.
// this cap stops a visitor from forcing a server error by typing a silly number.
export const MAX_PAGE_NUMBER = 1000000;
 
// what a controller passes in: the raw "page" and "limit" from the address.
// the values are "unknown" because anyone can type anything there (even words or lists).
export interface PaginationQuery {
  page?: unknown;
  limit?: unknown;
}
 
// the clean numbers we give back.
// "skip" and "take" are the two words prisma uses for paging.
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}
 
// the "meta" block that goes next to a list reply.
// the keys are camelCase here. the response interceptor turns them into snake_case (total_pages).
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
 
// a small box that holds a list and its meta block.
// a service returns this, and the response interceptor sees it and knows "this is a list reply".
// "public readonly" in the constructor creates the two fields and fills them in one step.
export class PaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly meta: PaginationMeta,
  ) {}
}
 
// changes a raw value into a whole number, or gives back undefined if it is not usable.
function toWholeNumber(value: unknown): number | undefined {
  // only text and numbers can become a number (a list or an object cannot).
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
 
  // values from the address bar are text, so we change them to a number.
  const parsed = Number(value);
 
  // words like "abc" become NaN (not a number), and "Infinity" is not usable either.
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
 
  // cut off any decimal part (2.7 becomes 2).
  return Math.floor(parsed);
}
 
// reads "page" and "limit" and gives back safe numbers.
// bad or missing values get the defaults, and big values are cut down.
export function getPaginationParams(
  query: PaginationQuery = {},
): PaginationParams {
  // turn both raw values into numbers (or undefined).
  const rawPage = toWholeNumber(query.page);
  const rawLimit = toWholeNumber(query.limit);
 
  // page: missing or smaller than 1 becomes 1. too big is cut down to the cap.
  const page =
    rawPage === undefined || rawPage < 1
      ? 1
      : Math.min(rawPage, MAX_PAGE_NUMBER);
 
  // limit: missing or smaller than 1 becomes the default. too big is cut down to 50.
  const limit =
    rawLimit === undefined || rawLimit < 1
      ? DEFAULT_PAGE_LIMIT
      : Math.min(rawLimit, MAX_PAGE_LIMIT);
 
  return {
    page,
    limit,
    // how many items to jump over. page 1 skips 0, page 2 skips one full page, and so on.
    skip: (page - 1) * limit,
    // how many items to read.
    take: limit,
  };
}
 
// builds the meta block from the page, the limit, and the total number of items.
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    // round up, so 87 items with 10 per page gives 9 pages. zero items gives 0 pages.
    totalPages: Math.ceil(total / limit),
  };
}
 
// the one call a service makes at the end of a list route.
// example: return paginated(groups, params, totalGroups);
export function paginated<T>(
  items: T[],
  params: PaginationParams,
  total: number,
): PaginatedResult<T> {
  return new PaginatedResult(
    items,
    buildPaginationMeta(params.page, params.limit, total),
  );
}