// imports: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// imports: the check decorators from class-validator. each one adds one rule to a field.
import { IsString, MaxLength, MinLength } from 'class-validator';
// import: the shared text cleaner. it removes spaces at the start and end of a text value.
import { trimText } from '../../common/utils/text-transforms';
// import: the shared length limits for the reason.
import { REJECT_REASON_MAX_LENGTH, REJECT_REASON_MIN_LENGTH } from '../join-requests.constants';

// the rules for the POST /join-requests/:id/reject body.
// the client sends "reason". the service saves it in the review_note column.
// "reason" is used in the api because it says what the leader must write. "review_note" is only the column name.
export class RejectJoinRequestDto {
  // why the leader said no, for example "We already cover this topic. Try the evening group".
  // required, because the plan wants a rejected student to know why, instead of feeling ignored.
  // the text is trimmed first, so "  ab  " counts as 2 characters and is refused.
  @Transform(trimText)
  @IsString()
  @MinLength(REJECT_REASON_MIN_LENGTH)
  @MaxLength(REJECT_REASON_MAX_LENGTH)
  reason!: string;
}