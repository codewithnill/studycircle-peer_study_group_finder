// import: "plainToInstance" turns a plain object into a real dto object and runs the @Transform() cleaners, the same as the app does.
import { plainToInstance } from 'class-transformer';
// import: "validate" runs every check decorator on a dto object and gives back the list of failed fields.
import { validate } from 'class-validator';
// import: the two input shapes under test.
import { RejectJoinRequestDto } from './reject-join-request.dto';
import { SendJoinRequestDto } from './send-join-request.dto';

// builds a dto from a plain body and gives back the names of the fields that failed, sorted a to z.
// an empty list means the body passed every check. it is the same helper as in the groups dto tests.
async function failedFields<T extends object>(dtoClass: new () => T, body: object): Promise<string[]> {
  const dto = plainToInstance(dtoClass, body);
  const errors = await validate(dto);
  return errors.map((error) => error.property).sort();
}

// describe, it and expect are jest tools. they are available without an import.
describe('SendJoinRequestDto', () => {
  // the message is optional, so an empty body is a correct request.
  it('accepts an empty body', async () => {
    expect(await failedFields(SendJoinRequestDto, {})).toEqual([]);
  });

  // spaces at the ends are removed before saving.
  it('trims the message', async () => {
    const dto = plainToInstance(SendJoinRequestDto, { message: '  I need help with trees  ' });
    expect(dto.message).toBe('I need help with trees');
  });

  // a box left empty, or filled with spaces only, means "no message", saved as null.
  it('turns an empty message or spaces only into null', async () => {
    expect(plainToInstance(SendJoinRequestDto, { message: '' }).message).toBeNull();
    expect(plainToInstance(SendJoinRequestDto, { message: '   ' }).message).toBeNull();
    expect(await failedFields(SendJoinRequestDto, { message: '   ' })).toEqual([]);
  });

  // the column holds 500 characters, so 500 passes and 501 is refused.
  it('accepts 500 characters and refuses 501', async () => {
    expect(await failedFields(SendJoinRequestDto, { message: 'a'.repeat(500) })).toEqual([]);
    expect(await failedFields(SendJoinRequestDto, { message: 'a'.repeat(501) })).toEqual(['message']);
  });

  // the message must be text, never a number or a list.
  it('refuses a message that is not text', async () => {
    expect(await failedFields(SendJoinRequestDto, { message: 42 })).toEqual(['message']);
    expect(await failedFields(SendJoinRequestDto, { message: ['a', 'b'] })).toEqual(['message']);
  });
});

describe('RejectJoinRequestDto', () => {
  // the reason is required, so a missing reason names the field.
  it('refuses a missing reason', async () => {
    expect(await failedFields(RejectJoinRequestDto, {})).toEqual(['reason']);
  });

  // spaces at the ends are removed before saving.
  it('trims the reason', async () => {
    const dto = plainToInstance(RejectJoinRequestDto, { reason: '  The group is for evening study  ' });
    expect(dto.reason).toBe('The group is for evening study');
  });

  // a reason of only spaces, or shorter than 3 characters after trimming, is not a real reason.
  it('refuses a reason shorter than 3 characters after trimming', async () => {
    expect(await failedFields(RejectJoinRequestDto, { reason: '   ' })).toEqual(['reason']);
    expect(await failedFields(RejectJoinRequestDto, { reason: '  no  ' })).toEqual(['reason']);
    expect(await failedFields(RejectJoinRequestDto, { reason: 'Sorry' })).toEqual([]);
  });

  // the smallest and the largest allowed lengths pass, and one more than the largest is refused.
  it('accepts 3 to 500 characters and refuses 501', async () => {
    expect(await failedFields(RejectJoinRequestDto, { reason: 'abc' })).toEqual([]);
    expect(await failedFields(RejectJoinRequestDto, { reason: 'a'.repeat(500) })).toEqual([]);
    expect(await failedFields(RejectJoinRequestDto, { reason: 'a'.repeat(501) })).toEqual(['reason']);
  });

  // the reason must be text, never a number or null.
  it('refuses a reason that is not text', async () => {
    expect(await failedFields(RejectJoinRequestDto, { reason: 12345 })).toEqual(['reason']);
    expect(await failedFields(RejectJoinRequestDto, { reason: null })).toEqual(['reason']);
  });
});