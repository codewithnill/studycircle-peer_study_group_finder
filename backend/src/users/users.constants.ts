// the length and range rules for the profile fields.
// both the register form and the profile edit form import these numbers, so the two forms can never disagree.
// the numbers match the column sizes of the users table in the schema file (section 1).

// the display name. the column is varchar(100), and a name is always required.
export const USER_NAME_MAX_LENGTH = 100;

// the department, for example "CSE". the column is varchar(100), and it may be empty (null).
export const USER_DEPARTMENT_MAX_LENGTH = 100;

// the short text about the person. the column is varchar(500), and it may be empty (null).
export const USER_BIO_MAX_LENGTH = 500;

// the year of study, as a whole number.
// 6 is allowed on purpose, because some programmes (for example a five-year degree) last longer than four years.
export const ACADEMIC_YEAR_MIN = 1;
export const ACADEMIC_YEAR_MAX = 6;

// the most subjects of interest that one person may keep.
// a small limit keeps the profile short and stops one account from filling the user_subjects table.
export const MAX_SUBJECTS_PER_USER = 10;

// the messages for the profile routes. each one is a plain sentence with a capital first letter (api shape rules, section 3, rule 1).

// the reply when a PATCH body holds no field at all. an empty change is most likely a mistake in the form.
export const NOTHING_TO_UPDATE_MESSAGE = 'Send at least one field to change';

// the reply for a public profile that cannot be shown.
// safety: an unknown id, a suspended account, and a deleted account all get this same text,
// so nobody can find out that a hidden account exists.
export const PROFILE_NOT_FOUND_MESSAGE = 'This profile does not exist';

// the reply when a subject id does not exist or is hidden by the admin (is_active = false).
// both cases get the same text, because a hidden subject must act as if it does not exist.
export const SUBJECT_NOT_FOUND_MESSAGE = 'This subject does not exist';

// the reply when a person adds a subject that is already in their list.
export const SUBJECT_ALREADY_ADDED_MESSAGE = 'This subject is already in your list';

// the reply when a person removes a subject that is not in their list.
export const SUBJECT_NOT_IN_LIST_MESSAGE = 'This subject is not in your list';

// the reply when the list is already full. the number is built from the limit above, so the text never goes out of date.
export const SUBJECT_LIMIT_MESSAGE = `You can add up to ${MAX_SUBJECTS_PER_USER} subjects`;