// the shared rules and messages for groups, in one place, so the create form and the edit form can never disagree.
// each message is a plain sentence with a capital letter, written once and imported where it is needed.

// the text limits. they match the column sizes in the schema (title 150, topic 255, location 255).
// the description column has no size in the database, so the code sets a sensible limit.
export const GROUP_TITLE_MAX_LENGTH = 150;
export const GROUP_TOPIC_MAX_LENGTH = 255;
export const GROUP_DESCRIPTION_MAX_LENGTH = 2000;
export const GROUP_LOCATION_MAX_LENGTH = 255;

// the allowed group size, counting the leader. 2 means the leader plus one study partner.
export const GROUP_SIZE_MIN = 2;
export const GROUP_SIZE_MAX = 30;

// 404: the group does not exist, or the person may not see it (removed, deleted, or archived for a non-member).
// safety: every hidden case gives this same reply, so nobody can tell a hidden group from a missing one.
export const GROUP_NOT_FOUND_MESSAGE = 'This group does not exist';

// 404: the level does not exist or is hidden. the subject has its own message in users.constants.ts.
export const LEVEL_NOT_FOUND_MESSAGE = 'This level does not exist';

// 403: a member who is not the leader tried to change the group.
export const LEADER_ONLY_MESSAGE = 'Only the group leader can do this';

// 400: an in-person group was sent without a place to meet.
export const LOCATION_REQUIRED_MESSAGE = 'An in-person group needs a location';

// 400: the exam date is before today.
export const EXAM_DATE_IN_PAST_MESSAGE = 'The exam date cannot be in the past';

// 409: the new size is smaller than the number of people already inside.
export const SIZE_BELOW_MEMBERS_MESSAGE = 'The group already has more members than this size';

// 400: the search asked for exam days where the first day comes after the last day, so nothing could ever match.
export const EXAM_RANGE_INVALID_MESSAGE = 'The first exam day cannot be after the last exam day';