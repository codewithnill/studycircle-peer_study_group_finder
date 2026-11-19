// imports: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// imports: the check decorators from class-validator. each one adds one rule to a field.
// "ValidateIf" runs the other checks on a field only when its condition is true.
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
// import: the shared text cleaning helpers, the same ones the register form uses.
import { trimText, trimToNull } from '../../common/utils/text-transforms';
// import: the shared profile field rules, the same numbers the register form uses.
import {
  ACADEMIC_YEAR_MAX,
  ACADEMIC_YEAR_MIN,
  USER_BIO_MAX_LENGTH,
  USER_DEPARTMENT_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
} from '../users.constants';

// the rules for the PATCH /users/me body. every field is optional, because a person may change only one thing.
// a missing field means "do not change it". null means "clear it" (only for fields that may be empty).
// safety: only these four fields are listed. email, role, status, and password are left out on purpose.
// the validation pipe refuses unknown fields, so a body with role: "admin" gets a 400 error.
// an empty body {} passes these checks. the users service refuses it, because these rules look at one field at a time.
export class UpdateProfileDto {
  // the display name. it may be missing, but it may never be null or empty, because every account needs a name.
  // @IsOptional() is not used here, because it would also let null through and skip every check.
  // @ValidateIf() runs the checks whenever the field was sent at all, so null fails @IsString().
  @ValidateIf((body: UpdateProfileDto) => body.name !== undefined)
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(USER_NAME_MAX_LENGTH)
  name?: string;

  // the department, for example "CSE". "" or only spaces becomes null, and null clears the field.
  // @IsOptional() skips the checks for null and for a missing field, which is right here.
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(USER_DEPARTMENT_MAX_LENGTH)
  department?: string | null;

  // the year of study, a whole number inside the shared range (1 to 6). null clears it.
  // "academic_year" in the body arrives here as "academicYear", because the shared pipe changes the keys first.
  @IsOptional()
  @IsInt()
  @Min(ACADEMIC_YEAR_MIN)
  @Max(ACADEMIC_YEAR_MAX)
  academicYear?: number | null;

  // the short text about the person. "" or only spaces becomes null, and null clears the field.
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(USER_BIO_MAX_LENGTH)
  bio?: string | null;
}