// import: "plainToInstance" turns a plain object into a real dto object and runs the @Transform() cleaners, the same as the app does.
import { plainToInstance } from 'class-transformer';
// import: "validate" runs every check decorator on a dto object and gives back the list of failed fields.
import { validate } from 'class-validator';
// import: the three input shapes under test.
import { CreateGroupDto } from './create-group.dto';
import { SearchGroupsDto } from './search-groups.dto';
import { UpdateGroupDto } from './update-group.dto';

// builds a dto from a plain body and gives back the names of the fields that failed, sorted a to z.
// an empty list means the body passed every check.
// "new () => T" means "a class that can be created with new", so the helper works for every dto.
async function failedFields<T extends object>(dtoClass: new () => T, body: object): Promise<string[]> {
  const dto = plainToInstance(dtoClass, body);
  const errors = await validate(dto);
  return errors.map((error) => error.property).sort();
}

// a create body that passes every check. each test changes one field.
// the keys are camelCase here, because in the real app the snake-to-camel pipe has already run.
const VALID_CREATE = {
  title: 'Data Structures exam prep',
  subjectId: 1,
  description: 'Weekly practice with past papers.',
  mode: 'online',
  maxSize: 5,
};

// describe, it and expect are jest tools. they are available without an import.
describe('CreateGroupDto', () => {
  // the smallest correct body must pass.
  it('accepts a minimal valid body', async () => {
    expect(await failedFields(CreateGroupDto, VALID_CREATE)).toEqual([]);
  });

  // every required field must be named when it is missing, so a form can mark each box.
  it('names every missing required field', async () => {
    expect(await failedFields(CreateGroupDto, {})).toEqual([
      'description',
      'maxSize',
      'mode',
      'subjectId',
      'title',
    ]);
  });

  // spaces at the ends are removed, and a title of only spaces is refused, because it becomes empty.
  it('trims the title and refuses a title of only spaces', async () => {
    const dto = plainToInstance(CreateGroupDto, { ...VALID_CREATE, title: '  Graph theory  ' });
    expect(dto.title).toBe('Graph theory');

    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, title: '   ' })).toEqual(['title']);
  });

  // the size limits are 2 and 30, and both ends are allowed.
  it('accepts a size from 2 to 30 and refuses 1 and 31', async () => {
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, maxSize: 2 })).toEqual([]);
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, maxSize: 30 })).toEqual([]);
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, maxSize: 1 })).toEqual(['maxSize']);
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, maxSize: 31 })).toEqual(['maxSize']);
  });

  // only the two fixed mode words are allowed.
  it('refuses a mode that is not online or in_person', async () => {
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, mode: 'hybrid' })).toEqual(['mode']);
  });

  // the exam date must be a real day written as YYYY-MM-DD, with no time part.
  it('accepts only a real YYYY-MM-DD exam date', async () => {
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, examDate: '2099-12-15' })).toEqual([]);
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, examDate: '2099-02-30' })).toEqual([
      'examDate',
    ]);
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, examDate: '15-12-2099' })).toEqual([
      'examDate',
    ]);
    expect(
      await failedFields(CreateGroupDto, { ...VALID_CREATE, examDate: '2099-12-15T10:00:00Z' }),
    ).toEqual(['examDate']);
  });

  // a subject id sent as text, like "5", is refused. the form must send a real number.
  // note: this is the body rule. the search query is different, because every value in the address is text.
  it('refuses a subject id written as text', async () => {
    expect(await failedFields(CreateGroupDto, { ...VALID_CREATE, subjectId: '5' })).toEqual(['subjectId']);
  });
});

describe('UpdateGroupDto', () => {
  // an empty body passes the field checks. the service refuses it with its own clear message.
  it('accepts an empty body at the field level', async () => {
    expect(await failedFields(UpdateGroupDto, {})).toEqual([]);
  });

  // these fields may be left out, but never cleared, because the database needs a value.
  it('refuses null for title, subject, description, mode, size and members_can_post', async () => {
    const body = {
      title: null,
      subjectId: null,
      description: null,
      mode: null,
      maxSize: null,
      membersCanPost: null,
    };
    expect(await failedFields(UpdateGroupDto, body)).toEqual([
      'description',
      'maxSize',
      'membersCanPost',
      'mode',
      'subjectId',
      'title',
    ]);
  });

  // these fields may be cleared with null.
  it('accepts null for level, topic, exam date and location', async () => {
    const body = { levelId: null, topic: null, examDate: null, location: null };
    expect(await failedFields(UpdateGroupDto, body)).toEqual([]);
  });

  // the edit form uses the same size limits as the create form.
  it('uses the same size limits as the create form', async () => {
    expect(await failedFields(UpdateGroupDto, { maxSize: 1 })).toEqual(['maxSize']);
    expect(await failedFields(UpdateGroupDto, { maxSize: 30 })).toEqual([]);
  });
});

// the search query. every value is text here, because values in the address always arrive as text.
describe('SearchGroupsDto', () => {
  // a search with no filters is allowed. it shows every group that may appear in search.
  it('accepts an empty query', async () => {
    expect(await failedFields(SearchGroupsDto, {})).toEqual([]);
  });

  // a whole number written as text becomes a real number, so the service can pass it straight to prisma.
  it('turns "5" into the number 5 for subject_id and level_id', async () => {
    const dto = plainToInstance(SearchGroupsDto, { subjectId: '5', levelId: '2' });
    expect(dto.subjectId).toBe(5);
    expect(dto.levelId).toBe(2);
    expect(await failedFields(SearchGroupsDto, { subjectId: '5', levelId: '2' })).toEqual([]);
  });

  // anything that is not a plain whole number from 1 to the largest id is refused.
  // safety: a too-big number must be refused here, before it can reach the database and cause a 500 error.
  it('refuses a bad subject id', async () => {
    for (const bad of ['abc', '5.5', '-1', '0', '2147483648', '99999999999']) {
      expect(await failedFields(SearchGroupsDto, { subjectId: bad })).toEqual(['subjectId']);
    }
  });

  // a repeated key, like ?subject_id=1&subject_id=2, arrives as a list. a list is not a whole number, so it is refused.
  it('refuses a repeated subject id', async () => {
    expect(await failedFields(SearchGroupsDto, { subjectId: ['1', '2'] })).toEqual(['subjectId']);
  });

  // a form sends "" for a box or dropdown that was left empty. "" must mean "no filter", not an error.
  it('treats an empty value as no filter', async () => {
    const body = { q: '   ', subjectId: '', levelId: '', mode: '', location: '', examFrom: '', examTo: '', sort: '' };
    const dto = plainToInstance(SearchGroupsDto, body);
    expect(dto.q).toBeNull();
    expect(dto.subjectId).toBeUndefined();
    expect(dto.mode).toBeUndefined();
    expect(dto.sort).toBeUndefined();
    expect(await failedFields(SearchGroupsDto, body)).toEqual([]);
  });

  // spaces at the ends of the search text are removed.
  it('trims the search text', async () => {
    const dto = plainToInstance(SearchGroupsDto, { q: '  graphs  ' });
    expect(dto.q).toBe('graphs');
  });

  // the search text has a length limit, so a huge text cannot slow down the database.
  it('refuses search text longer than 100 characters', async () => {
    expect(await failedFields(SearchGroupsDto, { q: 'a'.repeat(100) })).toEqual([]);
    expect(await failedFields(SearchGroupsDto, { q: 'a'.repeat(101) })).toEqual(['q']);
  });

  // only the two fixed mode words are allowed, the same as the create form.
  it('accepts online and in_person, and refuses any other mode', async () => {
    expect(await failedFields(SearchGroupsDto, { mode: 'online' })).toEqual([]);
    expect(await failedFields(SearchGroupsDto, { mode: 'in_person' })).toEqual([]);
    expect(await failedFields(SearchGroupsDto, { mode: 'hybrid' })).toEqual(['mode']);
  });

  // the two exam days must be real days written as YYYY-MM-DD.
  it('accepts only real YYYY-MM-DD exam days', async () => {
    expect(await failedFields(SearchGroupsDto, { examFrom: '2026-12-01', examTo: '2026-12-31' })).toEqual([]);
    expect(await failedFields(SearchGroupsDto, { examFrom: '2026-02-30' })).toEqual(['examFrom']);
    expect(await failedFields(SearchGroupsDto, { examTo: '31-12-2026' })).toEqual(['examTo']);
  });

  // only the two sort words from the plan are allowed.
  it('accepts newest and exam_soonest, and refuses any other sort', async () => {
    expect(await failedFields(SearchGroupsDto, { sort: 'newest' })).toEqual([]);
    expect(await failedFields(SearchGroupsDto, { sort: 'exam_soonest' })).toEqual([]);
    expect(await failedFields(SearchGroupsDto, { sort: 'oldest' })).toEqual(['sort']);
  });

  // page and limit are never refused here. the paging helper fixes a bad value later (api shape rules, section 4).
  it('never refuses page or limit', async () => {
    expect(await failedFields(SearchGroupsDto, { page: 'abc', limit: '-5' })).toEqual([]);
  });
});