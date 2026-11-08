// this file holds the fixed reasons a user can pick when reporting something.
// reports.reason is a plain text column in the database, so only the code guards the spelling.
 
// the five report reasons in the mvp.
// "as const" keeps the exact words and makes the object read-only.
export const REPORT_REASONS = {
  // unwanted or repeated promotion.
  SPAM: 'spam',
  // bullying or threats.
  HARASSMENT: 'harassment',
  // content that does not belong on the platform.
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  // pretending to be someone else.
  IMPERSONATION: 'impersonation',
  // anything else. the reporter explains in the details field.
  OTHER: 'other',
} as const;
 
// a type that means "any one of the five words above".
export type ReportReason = (typeof REPORT_REASONS)[keyof typeof REPORT_REASONS];
 
// the same five words as a list, for dtos to check incoming data.
export const REPORT_REASON_VALUES: ReportReason[] = Object.values(REPORT_REASONS);