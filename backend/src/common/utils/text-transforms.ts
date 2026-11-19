// import: the type of the object that class-transformer hands to a @Transform() function.
// "import type" is used because only the type is needed, not any running code.
import type { TransformFnParams } from 'class-transformer';

// removes spaces at the start and end of a text value.
// other kinds of values (numbers, null, objects) pass through unchanged,
// so the checks that run after it can refuse them with a clear error.
// it is used for required text, like a name: "   " becomes "", and then @IsNotEmpty() refuses it.
export const trimText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// removes spaces at the start and end, and turns text that is empty after that into null.
// it is used for optional text that a person may clear, like department and bio.
// an html form sends "" for an empty box, so "" and null both mean "no value".
// saving null in both cases keeps one meaning in the database.
export const trimToNull = ({ value }: TransformFnParams): unknown => {
  // a value that is not text passes through, so @IsString() can still refuse something like a number.
  if (typeof value !== 'string') {
    return value;
  }

  // trim first, so a value of only spaces also counts as empty.
  const trimmed = value.trim();

  // empty text becomes null. any other text is kept, without its outer spaces.
  return trimmed === '' ? null : trimmed;
};