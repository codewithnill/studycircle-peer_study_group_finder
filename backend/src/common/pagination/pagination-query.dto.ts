// import: "IsOptional" is a check decorator from class-validator. it says "this field may be missing".
// it is the only rule in this file, on purpose. the reason is written above the class.
import { IsOptional } from 'class-validator';

// the shared query shape for every list route that uses page style paging (section 4 of the api shape rules).
// a list route's own query dto extends this class, so it gets "page" and "limit" without writing them again.
// example: class SearchGroupsDto extends PaginationQueryDto { ... }
// "extends" means the new class starts with every field of this class, and then adds its own.
// why there is only @IsOptional() and no number rule:
// 1. the validation pipe refuses any query key that has no decorator. @IsOptional() marks both keys as allowed keys.
// 2. a bad value like "abc" or "-5" must be fixed, not refused. getPaginationParams() in pagination.ts does the fixing.
// safety: both values are typed "unknown", because anyone can type anything in the address, even a list (?page=1&page=2).
// "unknown" forces the code to pass them through getPaginationParams() before any use, so a raw value never reaches prisma.
export class PaginationQueryDto {
  // the page number to show. 1 is the first page.
  // @IsOptional() lets the field be missing. a missing or bad value becomes 1 later, in the paging helper.
  @IsOptional()
  page?: unknown;

  // how many items one page holds.
  // @IsOptional() lets the field be missing. a missing or bad value becomes 10 later, and a big value is cut down to 50.
  @IsOptional()
  limit?: unknown;
}