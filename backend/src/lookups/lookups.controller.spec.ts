// import type: the service shape and the two reply types. only types are borrowed here.
import type { LevelOption, LookupsService, SubjectOption } from './lookups.service';
// import: the controller under test.
import { LookupsController } from './lookups.controller';

// made-up rows in the same shape the service gives back.
const SUBJECTS: SubjectOption[] = [{ id: 1, name: 'Calculus', category: 'Math', courseCode: 'MAT101' }];
const LEVELS: LevelOption[] = [{ id: 1, name: 'Beginner', description: 'New to the subject' }];

// builds the controller with a fake service that gives back the rows above.
// the controller is thin, so the tests only check that it passes the service result on unchanged.
function makeController(): LookupsController {
  const fakeService = {
    listActiveSubjects: () => Promise.resolve(SUBJECTS),
    listActiveLevels: () => Promise.resolve(LEVELS),
  };
  // "as unknown as LookupsService" tells typescript to accept the small fake in place of the full service.
  return new LookupsController(fakeService as unknown as LookupsService);
}

// describe, it and expect are jest tools. they are available without an import.
describe('LookupsController', () => {
  // GET /subjects must give back the service's subject list.
  it('gives back the active subjects from the service', async () => {
    await expect(makeController().listSubjects()).resolves.toEqual(SUBJECTS);
  });

  // GET /levels must give back the service's level list.
  it('gives back the active levels from the service', async () => {
    await expect(makeController().listLevels()).resolves.toEqual(LEVELS);
  });
});