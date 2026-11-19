// import: "plainToInstance" turns a plain object into a dto object and runs the @Transform() helpers, like the real pipe does.
import { plainToInstance, type ClassConstructor } from 'class-transformer';
// import: "validate" runs the class-validator rules on a dto object and gives the list of errors.
import { validate } from 'class-validator';
// import: "BadRequestException" is the 400 error the shared validation pipe throws.
import { BadRequestException } from '@nestjs/common';
// import: the shared validation pipe, so one test can prove the "unknown field" rule with the real settings.
import { createValidationPipe } from '../../common/pipes/validation-pipe.factory';
// import: the largest id an integer column can hold.
import { MAX_INT_ID } from '../../common/constants';
// import: the two dto classes under test.
import { AddSubjectDto } from './add-subject.dto';
import { UpdateProfileDto } from './update-profile.dto';

// runs the transforms and the checks on a plain object, and gives the cleaned dto and the names of the failed fields.
// the names are the camelCase property names, because these tests skip the snake-to-camel pipe.
async function check<T extends object>(dtoClass: ClassConstructor<T>, plain: object) {
  const dto = plainToInstance(dtoClass, plain);
  const errors = await validate(dto);
  return { dto, fields: errors.map((error) => error.property) };
}

// a group of tests for the profile edit body.
describe('UpdateProfileDto', () => {
  // a normal body passes, and the name loses its outer spaces.
  it('accepts a full valid body and trims the name', async () => {
    const { dto, fields } = await check(UpdateProfileDto, {
      name: '  Ana Rahman ',
      department: 'CSE',
      academicYear: 3,
      bio: 'Second year, likes graphs.',
    });

    expect(fields).toEqual([]);
    expect(dto.name).toBe('Ana Rahman');
  });

  // the dto alone does not refuse an empty body. the users service does that.
  it('passes an empty body to the service', async () => {
    const { fields } = await check(UpdateProfileDto, {});

    expect(fields).toEqual([]);
  });

  // safety: every account needs a name, so null must not clear it.
  it('refuses a null name', async () => {
    const { fields } = await check(UpdateProfileDto, { name: null });

    expect(fields).toContain('name');
  });

  it('refuses a name of only spaces', async () => {
    const { fields } = await check(UpdateProfileDto, { name: '    ' });

    expect(fields).toContain('name');
  });

  it('refuses a name longer than 100 characters', async () => {
    const { fields } = await check(UpdateProfileDto, { name: 'a'.repeat(101) });

    expect(fields).toContain('name');
  });

  // an html form sends "" for an empty box. it must be saved as null.
  it('turns an empty department and bio into null', async () => {
    const { dto, fields } = await check(UpdateProfileDto, { department: '', bio: '   ' });

    expect(fields).toEqual([]);
    expect(dto.department).toBeNull();
    expect(dto.bio).toBeNull();
  });

  // null is the way to clear a field that may be empty.
  it('allows null to clear department, academic year, and bio', async () => {
    const { fields } = await check(UpdateProfileDto, {
      department: null,
      academicYear: null,
      bio: null,
    });

    expect(fields).toEqual([]);
  });

  it('refuses a bio longer than 500 characters', async () => {
    const { fields } = await check(UpdateProfileDto, { bio: 'b'.repeat(501) });

    expect(fields).toContain('bio');
  });

  // the year must be a whole number from 1 to 6. each bad value is checked on its own.
  it('refuses a year that is out of range or not a whole number', async () => {
    for (const academicYear of [0, 7, 2.5, '3']) {
      const { fields } = await check(UpdateProfileDto, { academicYear });

      expect(fields).toContain('academicYear');
    }
  });

  // a number is not a department name. trimToNull lets it through, so @IsString() can refuse it.
  it('refuses a number as the department', async () => {
    const { fields } = await check(UpdateProfileDto, { department: 5 });

    expect(fields).toContain('department');
  });

  // safety: the real validation pipe must refuse fields that are not listed, so nobody can change a role or an email.
  it('refuses role, email, status, and password through the real validation pipe', async () => {
    const pipe = createValidationPipe();
    const body = {
      name: 'Eve',
      role: 'admin',
      email: 'eve@example.com',
      status: 'active',
      password: 'new-password-1',
    };

    // the pipe throws a 400 error. the test catches it to read the "errors" list.
    const error: unknown = await pipe
      .transform(body, { type: 'body', metatype: UpdateProfileDto, data: '' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    const reply = (error as BadRequestException).getResponse() as {
      errors: { field: string; message: string }[];
    };
    // the exact message the api shape rules promise for an unknown field.
    expect(reply.errors).toContainEqual({ field: 'role', message: 'property role should not exist' });
    // each of the other three fields is named too.
    const named = reply.errors.map((item) => item.field);
    expect(named).toEqual(expect.arrayContaining(['email', 'status', 'password']));
  });
});

// a group of tests for the add subject body.
describe('AddSubjectDto', () => {
  it('accepts a whole number id', async () => {
    const { fields } = await check(AddSubjectDto, { subjectId: 3 });

    expect(fields).toEqual([]);
  });

  // each bad value must be refused: zero, a text, a decimal, and a number too big for the column.
  it('refuses an id that is not a whole number from 1 to the integer limit', async () => {
    for (const subjectId of [0, '3', 1.5, MAX_INT_ID + 1]) {
      const { fields } = await check(AddSubjectDto, { subjectId });

      expect(fields).toContain('subjectId');
    }
  });

  it('refuses a body without a subject id', async () => {
    const { fields } = await check(AddSubjectDto, {});

    expect(fields).toContain('subjectId');
  });
});