// this file holds the fixed words for the admin activity log.
// admin_actions.action and admin_actions.target_type are plain text columns in the database,
// so only the code guards the spelling.
 
// the eight kinds of things an admin can act on.
// this list is bigger than the report target list on purpose,
// because admins also act on reports, subjects, and levels.
// the report target list comes from prisma, not from this file.
export const ADMIN_TARGET_TYPES = {
  USER: 'user',
  GROUP: 'group',
  MESSAGE: 'message',
  POST: 'post',
  FILE: 'file',
  REPORT: 'report',
  SUBJECT: 'subject',
  LEVEL: 'level',
} as const;
 
// a type that means "any one of the eight words above".
export type AdminTargetType =
  (typeof ADMIN_TARGET_TYPES)[keyof typeof ADMIN_TARGET_TYPES];
 
// the eight words as a list, for dtos to check incoming data.
export const ADMIN_TARGET_TYPE_VALUES: AdminTargetType[] =
  Object.values(ADMIN_TARGET_TYPES);
 
// the seventeen admin actions in the mvp.
// the pattern is "past tense verb + thing". every admin change writes one row in the log.
export const ADMIN_ACTIONS = {
  // users
  SUSPENDED_USER: 'suspended_user',
  UNSUSPENDED_USER: 'unsuspended_user',
  DELETED_USER: 'deleted_user',
  // groups
  REMOVED_GROUP: 'removed_group',
  FLAGGED_GROUP: 'flagged_group',
  UNFLAGGED_GROUP: 'unflagged_group',
  // reports
  RESOLVED_REPORT: 'resolved_report',
  DISMISSED_REPORT: 'dismissed_report',
  // content
  REMOVED_POST: 'removed_post',
  REMOVED_MESSAGE: 'removed_message',
  REMOVED_FILE: 'removed_file',
  // subjects
  CREATED_SUBJECT: 'created_subject',
  UPDATED_SUBJECT: 'updated_subject',
  DEACTIVATED_SUBJECT: 'deactivated_subject',
  // levels
  CREATED_LEVEL: 'created_level',
  UPDATED_LEVEL: 'updated_level',
  DEACTIVATED_LEVEL: 'deactivated_level',
} as const;
 
// a type that means "any one of the seventeen words above".
export type AdminAction = (typeof ADMIN_ACTIONS)[keyof typeof ADMIN_ACTIONS];
 
// the seventeen words as a list, for dtos to check incoming data.
export const ADMIN_ACTION_VALUES: AdminAction[] = Object.values(ADMIN_ACTIONS);
 
// says which target type each action uses.
// "Record<AdminAction, AdminTargetType>" means: every action must appear as a key exactly once,
// and every value must be a valid target type.
// if someone adds a new action and forgets this table, the build fails. that is the point.
// the code can use this table to make sure the log never says
// "removed_post" together with a target type of "user".
export const ADMIN_ACTION_TARGET_TYPE: Record<AdminAction, AdminTargetType> = {
  [ADMIN_ACTIONS.SUSPENDED_USER]: ADMIN_TARGET_TYPES.USER,
  [ADMIN_ACTIONS.UNSUSPENDED_USER]: ADMIN_TARGET_TYPES.USER,
  [ADMIN_ACTIONS.DELETED_USER]: ADMIN_TARGET_TYPES.USER,
  [ADMIN_ACTIONS.REMOVED_GROUP]: ADMIN_TARGET_TYPES.GROUP,
  [ADMIN_ACTIONS.FLAGGED_GROUP]: ADMIN_TARGET_TYPES.GROUP,
  [ADMIN_ACTIONS.UNFLAGGED_GROUP]: ADMIN_TARGET_TYPES.GROUP,
  [ADMIN_ACTIONS.RESOLVED_REPORT]: ADMIN_TARGET_TYPES.REPORT,
  [ADMIN_ACTIONS.DISMISSED_REPORT]: ADMIN_TARGET_TYPES.REPORT,
  [ADMIN_ACTIONS.REMOVED_POST]: ADMIN_TARGET_TYPES.POST,
  [ADMIN_ACTIONS.REMOVED_MESSAGE]: ADMIN_TARGET_TYPES.MESSAGE,
  [ADMIN_ACTIONS.REMOVED_FILE]: ADMIN_TARGET_TYPES.FILE,
  [ADMIN_ACTIONS.CREATED_SUBJECT]: ADMIN_TARGET_TYPES.SUBJECT,
  [ADMIN_ACTIONS.UPDATED_SUBJECT]: ADMIN_TARGET_TYPES.SUBJECT,
  [ADMIN_ACTIONS.DEACTIVATED_SUBJECT]: ADMIN_TARGET_TYPES.SUBJECT,
  [ADMIN_ACTIONS.CREATED_LEVEL]: ADMIN_TARGET_TYPES.LEVEL,
  [ADMIN_ACTIONS.UPDATED_LEVEL]: ADMIN_TARGET_TYPES.LEVEL,
  [ADMIN_ACTIONS.DEACTIVATED_LEVEL]: ADMIN_TARGET_TYPES.LEVEL,
};