// imports: the check decorators from class-validator.
import { IsInt, Max, Min } from 'class-validator';
// import: the largest id an integer column can hold, from the shared constants barrel.
import { MAX_INT_ID } from '../../common/constants';

// the rules for the POST /users/me/subjects body. the client sends { "subject_id": 5 }.
// the shared pipe changes "subject_id" to "subjectId" before these checks run.
// the person is never part of the body. the user id always comes from the login cookie.
export class AddSubjectDto {
  // the id of the subject to add. it must be a real json number, a whole number, and fit an integer column.
  // a text like "5" is refused, because the validation pipe does not change types on its own.
  // whether the subject exists and is active is checked in the users service, which gives a 404.
  @IsInt()
  @Min(1)
  @Max(MAX_INT_ID)
  subjectId: number;
}