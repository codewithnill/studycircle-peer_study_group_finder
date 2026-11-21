// imports: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// imports: the check decorators from class-validator. each one adds one rule to a field.
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
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
// import: the shared text cleaning helpers, the same ones the profile forms use.
import { trimText, trimToNull } from '../../common/utils/text-transforms';
// import: the shared group limits.
import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_LOCATION_MAX_LENGTH,
  GROUP_SIZE_MAX,
  GROUP_SIZE_MIN,
  GROUP_TITLE_MAX_LENGTH,
  GROUP_TOPIC_MAX_LENGTH,
} from '../groups.constants';

// a date written as year-month-day, for example "2026-12-15". no time part is allowed.
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// the rules for the POST /groups body.
// the client sends snake_case keys (subject_id, max_size). the shared pipe changes them to camelCase first.
// safety: leader_id, status, is_flagged, and institution_id are left out on purpose.
// the leader is always the logged-in person, and the validation pipe refuses any unknown field with 400.
// note: two rules need today's date or a second field, so the groups service checks them:
// the exam date must not be in the past, and an in-person group needs a location.
export class CreateGroupDto {
  // the group name, for example "Data Structures exam prep". required, and spaces at the ends are removed.
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(GROUP_TITLE_MAX_LENGTH)
  title!: string;

  // the subject id, picked from GET /subjects. a whole number. the service checks that the subject exists and is active.
  // "!" tells typescript that the validation pipe fills this field, so it is never empty after the checks.
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  subjectId!: number;

  // the level id, picked from GET /levels. optional. null means "no level".
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  levelId?: number | null;

  // a short focus inside the subject, for example "trees and graphs". optional. "" becomes null.
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_TOPIC_MAX_LENGTH)
  topic?: string | null;

  // what the group is about and how it works. required.
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(GROUP_DESCRIPTION_MAX_LENGTH)
  description!: string;

  // the exam date as "YYYY-MM-DD". optional, because some groups study a skill and not an exam. null means "no exam date".
  // @Matches() allows only the date shape. @IsISO8601() with strict: true also refuses a day that does not exist, like "2026-02-30".
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: 'exam_date must look like YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  examDate?: string | null;

  // online or in_person. @IsEnum() allows only the words in the Mode list.
  @IsEnum(Mode)
  mode!: Mode;

  // where an in-person group meets, or the area for an online one. "" becomes null.
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_LOCATION_MAX_LENGTH)
  location?: string | null;

  // the most people the group can hold, counting the leader. a whole number from 2 to 30.
  @IsInt()
  @Min(GROUP_SIZE_MIN)
  @Max(GROUP_SIZE_MAX)
  maxSize!: number;

  // whether members (not only the leader) may write posts. optional, and false when it is missing.
  @IsOptional()
  @IsBoolean()
  membersCanPost?: boolean;
}