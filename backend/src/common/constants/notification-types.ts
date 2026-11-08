// this file holds the fixed words for notifications.
// notifications.type is a plain text column in the database, so only the code guards the spelling.
// every part of the app imports the words from here instead of typing them by hand.
 
// the seven notification types in the mvp.
// "as const" tells typescript to keep the exact words and make the object read-only.
// without it, typescript would only know that each value is "some string".
export const NOTIFICATION_TYPES = {
  // sent to the group leader when a student sends a join request.
  JOIN_REQUEST_RECEIVED: 'join_request_received',
  // sent to the student when the leader approves the request.
  JOIN_REQUEST_APPROVED: 'join_request_approved',
  // sent to the student when the leader rejects the request. the reason is included.
  JOIN_REQUEST_REJECTED: 'join_request_rejected',
  // sent to group members when the leader schedules a session.
  SESSION_CREATED: 'session_created',
  // sent to group members when the leader cancels a session.
  SESSION_CANCELLED: 'session_cancelled',
  // sent to group members when the leader posts. posts by other members send nothing, to avoid noise.
  LEADER_POST_CREATED: 'leader_post_created',
  // sent to the new leader after a handover or an automatic promotion.
  BECAME_LEADER: 'became_leader',
} as const;
 
// a type that means "any one of the seven words above".
// "typeof NOTIFICATION_TYPES" reads the shape of the object.
// "keyof" gets its key names, and the square brackets pick the values that belong to those keys.
export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
 
// the same seven words as a list.
// a dto (a class that checks incoming data) can use this list to confirm that a word is allowed.
export const NOTIFICATION_TYPE_VALUES: NotificationType[] =
  Object.values(NOTIFICATION_TYPES);
 
// the keys inside a notification payload (the json details saved with a notification).
// every notification type uses the same four keys, so the frontend stays simple.
export const NOTIFICATION_PAYLOAD_KEYS = {
  // the group this notification is about.
  GROUP_ID: 'group_id',
  // the group name, for display.
  GROUP_TITLE: 'group_title',
  // a short sentence for the bell list.
  MESSAGE: 'message',
  // the id of the request, session, or post.
  RELATED_ID: 'related_id',
} as const;
 
// the shape of a payload object.
// the key names stay snake_case on purpose, because this object is saved as json
// in the database and sent to the frontend exactly as it is.
export interface NotificationPayload {
  group_id: number;
  group_title: string;
  message: string;
  related_id: number;
}