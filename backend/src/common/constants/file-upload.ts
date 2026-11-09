// this file holds the rules for uploaded files in the group files section.
 
// the only file types we accept, written as mime types.
// a mime type is a short label that says what kind of file something is.
// not allowed on purpose: svg (it can hide scripts), and the old .doc and .ppt formats.
// "as const" keeps the exact words and makes the list read-only.
export const ALLOWED_FILE_MIME_TYPES = [
  // pdf
  'application/pdf',
  // png image
  'image/png',
  // jpeg image
  'image/jpeg',
  // docx (word)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // pptx (powerpoint)
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // plain text
  'text/plain',
] as const;
 
// a type that means "any one of the six mime types above".
// "[number]" means "the type of any item in this list".
export type AllowedFileMimeType = (typeof ALLOWED_FILE_MIME_TYPES)[number];
 
// the biggest file we accept: 10 mb, written in bytes (10 * 1024 * 1024 = 10,485,760).
// the code must check this before saving the file.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
 
// checks if a text value is one of the allowed mime types.
// the "value is AllowedFileMimeType" part tells typescript:
// if this function returns true, treat the value as an allowed type from here on.
// safety: the mime type sent by the browser can be faked.
// this check alone is not enough. the code must also check the real file content, not only the label.
export function isAllowedFileMimeType(
  value: string,
): value is AllowedFileMimeType {
  // the list only accepts its own exact words, so we treat it as a plain list of strings
  // for this one check. then "includes" tells us if the value is in the list.
  return (ALLOWED_FILE_MIME_TYPES as readonly string[]).includes(value);
}