// imports: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// imports: the check decorators from class-validator. each one adds one rule to a field.
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
// import: the shared text cleaning helpers, so the register form and the profile form clean text the same way.
import { trimText, trimToNull } from '../../common/utils/text-transforms';
// import: the shared profile field rules. the profile edit form uses the same numbers.
import {
  ACADEMIC_YEAR_MAX,
  ACADEMIC_YEAR_MIN,
  USER_DEPARTMENT_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
} from '../../users/users.constants';
// import: the password length limits, so the numbers live in one place.
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants';

// the rules for the register request body.
// the shared pipes already change incoming keys to camelCase, so "academic_year" arrives here as "academicYear".
// safety: there is no "role" field on purpose. the validation pipe refuses unknown fields,
// so a request that sends role: "admin" gets a 400 error.
export class RegisterDto {
  // the display name. spaces at the ends are removed first, so a name of only spaces counts as empty.
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(USER_NAME_MAX_LENGTH)
  name: string;

  // the login email. it must be a real email shape and fit the 255 character column.
  @Transform(trimText)
  @IsEmail()
  @MaxLength(255)
  email: string;

  // the password. it is not trimmed, because spaces can be a real part of a password.
  // safety: this value is only hashed with bcrypt. it is never saved, logged, or sent back.
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  // optional: the department, for example "CSE".
  // an empty box ("") or only spaces becomes null, so the database never holds an empty text.
  // @IsOptional() then skips the other checks for null, because null means "no department".
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(USER_DEPARTMENT_MAX_LENGTH)
  department?: string | null;

  // optional: the year of study, a whole number inside the shared range (1 to 6).
  @IsOptional()
  @IsInt()
  @Min(ACADEMIC_YEAR_MIN)
  @Max(ACADEMIC_YEAR_MAX)
  academicYear?: number | null;
}