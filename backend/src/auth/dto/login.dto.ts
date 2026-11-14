// imports: the check decorators from class-validator. each one adds one rule to a field.
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
// imports: "Transform" cleans a value before the checks. the type describes what the cleaning function receives.
import { Transform, type TransformFnParams } from 'class-transformer';
// import: the password maximum, so the number lives in one place.
import { PASSWORD_MAX_LENGTH } from '../auth.constants';

// removes spaces at the start and end of a text value.
const trimText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// the rules for the login request body.
// the checks are loose on purpose: login must never tell a person what a "good" password looks like,
// and a wrong password must give the same general answer as an unknown email.
export class LoginDto {
  // the email used to log in.
  @Transform(trimText)
  @IsEmail()
  @MaxLength(255)
  email: string;

  // the password. it must be a non-empty text. the maximum stops a huge body from slowing down the hashing.
  // safety: this value is only compared with the stored hash. it is never saved, logged, or sent back.
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}