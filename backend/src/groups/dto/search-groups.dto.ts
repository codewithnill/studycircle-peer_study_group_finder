// import: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// import: the type of the object that class-transformer hands to a @Transform() function.
// "import type" is used because only the type is needed, not any running code.
import type { TransformFnParams } from 'class-transformer';
// imports: the check decorators from class-validator. each one adds one rule to a field.
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
// import: the fixed mode words (online, in_person) from the generated client, so they are never typed by hand.
import { Mode } from '../../generated/prisma/client';
// import: the largest id an integer column can hold, so a huge number never reaches prisma.
import { MAX_INT_ID } from '../../common/constants';
// import: the shared paging query from step 1. this class extends it, so "page" and "limit" are allowed keys too.
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
// import: the shared text cleaner. "" and "   " become null, so an empty search box counts as "no filter".
import { trimToNull } from '../../common/utils/text-transforms';
// import: the same date shape the create form uses, so search accepts exactly the same dates.
import { DATE_ONLY_PATTERN } from './create-group.dto';
// import: the longest location a group can store. a longer search text could never match, so it is refused.
import { GROUP_LOCATION_MAX_LENGTH } from '../groups.constants';

// the two sort choices from the 3-month plan. "as const" makes typescript treat them as exact words, not any text.
// "newest" shows the latest groups first. "exam_soonest" shows the nearest exam first.
export const GROUP_SEARCH_SORTS = ['newest', 'exam_soonest'] as const;

// the type made from the list above: "newest" | "exam_soonest". it is built from the list, so the two can never disagree.
export type GroupSearchSort = (typeof GROUP_SEARCH_SORTS)[number];

// the longest text a person may type in the main search box.
export const GROUP_SEARCH_TEXT_MAX_LENGTH = 100;

// turns an empty value into "missing".
// a search form often sends "" for a dropdown that was left on "any", for example ?mode=
// "missing" means "no filter", so @IsOptional() skips the checks for it.
function emptyToUndefined({ value }: TransformFnParams): unknown {
  return value === '' ? undefined : value;
}

// turns a whole number written as text, like "5", into the number 5.
// every value in the address arrives as text, so an id filter needs this step.
// anything else (a word, "5.5", "-1", a repeated key that became a list) passes through unchanged,
// so @IsInt() refuses it with a clear 400 error.
// safety: only up to 10 digits are turned into a number. @Max() then refuses anything above the largest id.
function queryWholeNumber({ value }: TransformFnParams): unknown {
  // an empty dropdown means "no filter".
  if (value === '') {
    return undefined;
  }
  // only plain digits are changed. "^" and "$" mean the whole text must match, not just a part.
  if (typeof value === 'string' && /^\d{1,10}$/.test(value)) {
    return Number(value);
  }
  return value;
}

// the rules for the GET /groups query (the search).
// the client sends snake_case keys (subject_id, exam_from). the shared pipe changes them to camelCase first.
// every filter is optional. a search with no filters shows all groups that may appear in search.
// note: one rule needs two fields, so the groups service checks it: exam_from must not be after exam_to.
// safety: the validation pipe refuses any key that is not listed here or in PaginationQueryDto, with 400.
export class SearchGroupsDto extends PaginationQueryDto {
  // words to look for in the title and the topic, for example "graph". "" becomes null, which means "no filter".
  // @IsOptional() skips the checks when the field is missing or null.
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_SEARCH_TEXT_MAX_LENGTH)
  q?: string | null;

  // only groups for this subject. the id comes from GET /subjects.
  // @Transform(queryWholeNumber) changes "5" into 5 before @IsInt() checks it.
  @IsOptional()
  @Transform(queryWholeNumber)
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  subjectId?: number;

  // only groups at this level. the id comes from GET /levels.
  @IsOptional()
  @Transform(queryWholeNumber)
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  levelId?: number;

  // only online groups or only in-person groups. @IsEnum() allows only the words in the Mode list.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(Mode)
  mode?: Mode;

  // words to look for in the location, for example "Dhaka". "" becomes null, which means "no filter".
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_LOCATION_MAX_LENGTH)
  location?: string | null;

  // the first exam day to include, as "YYYY-MM-DD".
  // @Matches() allows only the date shape. @IsISO8601() with strict: true also refuses a day that does not exist.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: 'exam_from must look like YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  examFrom?: string;

  // the last exam day to include, as "YYYY-MM-DD". the same day in both fields means "exactly this day".
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: 'exam_to must look like YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  examTo?: string;

  // the order of the results. @IsIn() allows only the words in the list. missing means "newest".
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(GROUP_SEARCH_SORTS)
  sort?: GroupSearchSort;
}