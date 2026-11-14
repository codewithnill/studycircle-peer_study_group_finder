// imports: "Transform" runs a small cleaning function on a value before the checks. the type describes what that function receives.
import { Transform, type TransformFnParams } from 'class-transformer';
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
// import: the password length limits, so the numbers live in one place.
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants';

// removes spaces at the start and end of a text value. other kinds of values pass through unchanged,
// so the checks below can reject them with a clear error.
const trimText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// the rules for the register request body.
// the shared pipes already change incoming keys to camelCase, so "academic_year" arrives here as "academicYear".
// safety: there is no "role" field on purpose. the validation pipe refuses unknown fields,
// so a request that sends role: "admin" gets a 400 error.
export class RegisterDto {
  // the display name. spaces at the ends are removed first, so a name of only spaces counts as empty.
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  department?: string;

  // optional: the year of study. a whole number from 1 to 6.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  academicYear?: number;
}