// this file holds small helper functions that change the spelling of object keys.
// the api talks in snake_case (max_size), but the code inside talks in camelCase (maxSize).
// these helpers do the change at the edge, so no feature code has to rename keys by hand.
// this file knows nothing about nestjs. it only works on plain data.
 
// keys that must never be copied.
// safety: a key named "__proto__" can change how every object in the app behaves
// (this attack is called prototype pollution). someone can send such a key inside json,
// so we simply drop these keys.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
 
// changes one word from camelCase to snake_case.
// example: maxSize becomes max_size.
export function toSnakeCase(text: string): string {
  return (
    text
      // put an underscore between a lowercase letter (or digit) and a capital letter.
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      // handle a run of capitals followed by a word, like HTTPServer.
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      // make everything lowercase.
      .toLowerCase()
  );
}
 
// changes one word from snake_case to camelCase.
// example: max_size becomes maxSize.
export function toCamelCase(text: string): string {
  // find an underscore followed by a letter or digit, remove the underscore,
  // and make that letter a capital.
  return text.replace(/_([a-z0-9])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}
 
// tells us if a value is an object whose keys we should walk through.
// dates, buffers (file bytes), typed arrays, streams, maps, and sets are left alone,
// because changing their insides would break them.
function isWalkableObject(value: unknown): value is Record<string, unknown> {
  // numbers, text, true/false, null, and undefined are not objects we can walk.
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  // a date is an object, but it has no keys we want to rename.
  if (value instanceof Date) {
    return false;
  }
  // buffers and typed arrays hold raw bytes.
  if (ArrayBuffer.isView(value)) {
    return false;
  }
  // maps and sets keep their data in a special way.
  if (value instanceof Map || value instanceof Set) {
    return false;
  }
  // a stream is something with a "pipe" function. we never touch it.
  if (typeof (value as { pipe?: unknown }).pipe === 'function') {
    return false;
  }
  // everything else (plain objects and class instances) can be walked.
  return true;
}
 
// walks through any value and rebuilds it with every key renamed by "convertKey".
// it goes deep: objects inside objects, and objects inside lists.
// values are never changed, only the key names.
// note: it expects data without loops (an object that contains itself).
// replies from the database never have loops.
function convertKeys(
  value: unknown,
  convertKey: (key: string) => string,
): unknown {
  // a list: convert every item inside it.
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convertKey));
  }
 
  // anything we should not walk (numbers, text, dates, ...) is returned as it is.
  if (!isWalkableObject(value)) {
    return value;
  }
 
  // a new object that will hold the renamed keys.
  const result: Record<string, unknown> = {};
 
  // go through every own key and value of the old object.
  for (const [key, innerValue] of Object.entries(value)) {
    // safety: skip dangerous keys, see the note at the top of this file.
    if (UNSAFE_KEYS.has(key)) {
      continue;
    }
    // rename the key, and convert the value too (it may hold more objects).
    result[convertKey(key)] = convertKeys(innerValue, convertKey);
  }
 
  return result;
}
 
// turns every key in a value into snake_case. used on replies going out.
export function keysToSnakeCase(value: unknown): unknown {
  return convertKeys(value, toSnakeCase);
}
 
// turns every key in a value into camelCase. used on request bodies and queries coming in.
export function keysToCamelCase(value: unknown): unknown {
  return convertKeys(value, toCamelCase);
}