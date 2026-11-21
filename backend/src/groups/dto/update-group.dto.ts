// imports: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// imports: the check decorators. "ValidateIf" runs the other checks only when its condition is true.
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
  ValidateIf,
} from 'class-validator';
// import: the fixed mode words from the generated client.
import { Mode } from '../../generated/prisma/client';
// import: the largest id an integer column can hold.
import { MAX_INT_ID } from '../../common/constants';
// import: the shared text cleaning helpers.
import { trimText, trimToNull } from '../../common/utils/text-transforms';
// import: the same date shape the create form uses, so both forms accept exactly the same dates.
import { DATE_ONLY_PATTERN } from './create-group.dto';
// import: the shared group limits.
import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_LOCATION_MAX_LENGTH,
  GROUP_SIZE_MAX,
  GROUP_SIZE_MIN,
  GROUP_TITLE_MAX_LENGTH,
  GROUP_TOPIC_MAX_LENGTH,
} from '../groups.constants';

// the rules for the PATCH /groups/:id body. every field is optional, because the leader may change only one thing.
// a missing field means "do not change it". null means "clear it", but only for fields that may be empty.
// the checks are the same as in the create form, with the same shared limits.
// safety: leader_id, status, is_flagged, and institution_id are left out, so the edit route can never change them.
// an empty body {} passes these checks. the groups service refuses it with a clear 400 message.
export class UpdateGroupDto {
  // these fields may be missing, but never null, because the database needs a value.
  // @IsOptional() is not used for them, because it would also let null through and skip every check.
  // @ValidateIf() runs the checks whenever the field was sent at all, so null fails them.

  @ValidateIf((body: UpdateGroupDto) => body.title !== undefined)
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(GROUP_TITLE_MAX_LENGTH)
  title?: string;

  @ValidateIf((body: UpdateGroupDto) => body.subjectId !== undefined)
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  subjectId?: number;

  @ValidateIf((body: UpdateGroupDto) => body.description !== undefined)
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(GROUP_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ValidateIf((body: UpdateGroupDto) => body.mode !== undefined)
  @IsEnum(Mode)
  mode?: Mode;

  @ValidateIf((body: UpdateGroupDto) => body.maxSize !== undefined)
  @IsInt()
  @Min(GROUP_SIZE_MIN)
  @Max(GROUP_SIZE_MAX)
  maxSize?: number;

  @ValidateIf((body: UpdateGroupDto) => body.membersCanPost !== undefined)
  @IsBoolean()
  membersCanPost?: boolean;

  // these fields may be cleared with null. @IsOptional() skips the checks for null and for a missing field, which is right here.

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  levelId?: number | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_TOPIC_MAX_LENGTH)
  topic?: string | null;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: 'exam_date must look like YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  examDate?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_LOCATION_MAX_LENGTH)
  location?: string | null;
}