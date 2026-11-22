// the shared rules and messages for join requests, in one place, so the dto, the service, and the tests never disagree.
// each message is a plain sentence with a capital letter, written once and imported where it is needed.

// the text limits. both columns (join_requests.message and join_requests.review_note) are varchar(500) in the schema.
export const JOIN_REQUEST_MESSAGE_MAX_LENGTH = 500;
// the reject reason must be real words. 3 characters blocks an empty answer like "." or "no".
export const REJECT_REASON_MIN_LENGTH = 3;
export const REJECT_REASON_MAX_LENGTH = 500;

// 404: the request does not exist, or the person may not see it (for example a student cancelling someone else's request).
// safety: every hidden case gives this same reply, so nobody can find other people's requests by guessing ids.
export const JOIN_REQUEST_NOT_FOUND_MESSAGE = 'This join request does not exist';

// 409: the student is already an active member of the group (the leader counts as a member too).
export const ALREADY_MEMBER_MESSAGE = 'You are already a member of this group';

// 409: the group has no seats left. used when sending a request and again inside the approve transaction.
export const GROUP_FULL_MESSAGE = 'This group is full';

// 409: the database refused a second pending request from the same student for the same group (the partial unique index).
// the wording matches the example in the api shape rules, section 3.
export const DUPLICATE_PENDING_MESSAGE = 'You already have a pending request for this group';

// 409: the request is no longer pending, so it cannot be approved, rejected, or cancelled again.
// only "pending" can change. the other three statuses are final (fixed values file, A7, rule 1).
export const REQUEST_ALREADY_ANSWERED_MESSAGE = 'This request has already been answered';