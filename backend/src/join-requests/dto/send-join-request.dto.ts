// imports: "Transform" runs a small cleaning function on a value before the checks run.
import { Transform } from 'class-transformer';
// imports: the check decorators from class-validator. each one adds one rule to a field.
import { IsOptional, IsString, MaxLength } from 'class-validator';
// import: the shared text cleaner. it trims spaces and turns empty text into null.
import { trimToNull } from '../../common/utils/text-transforms';
// import: the shared length limit for the message.
import { JOIN_REQUEST_MESSAGE_MAX_LENGTH } from '../join-requests.constants';

// the rules for the POST /groups/:id/join-requests body.
// safety: group_id, user_id, and status are left out on purpose.
// the group comes from the address, the student is always the logged-in person, and a new request is always "pending".
// the validation pipe refuses any unknown field with 400, so nobody can send "status": "approved".
export class SendJoinRequestDto {
  // a short note to the leader, for example "I am in the same section and need help with trees".
  // optional, so a shy student can still ask to join. "" and spaces only become null.
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(JOIN_REQUEST_MESSAGE_MAX_LENGTH)
  message?: string | null;
}