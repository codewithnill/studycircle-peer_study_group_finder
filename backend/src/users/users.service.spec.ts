// import: the service and the select objects that are tested.
import {
  AUTH_STATE_USER_SELECT,
  LOGIN_USER_SELECT,
  OWN_USER_SELECT,
  SAFE_USER_SELECT,
  UsersService,
} from './users.service';
// import: the type of the database connection. it is only used as a type here, so no real connection is made.
import { PrismaService } from '../prisma/prisma.service';
// import: the fixed role words from the generated client.
import { Role } from '../generated/prisma/client';

// a group of tests for the users service.
describe('UsersService', () => {
  // the service under test. it is rebuilt before every test, so no test sees leftovers of another.
  let service: UsersService;
  // fake database functions. jest.fn() makes a function that records how it was called.
  const findFirst = jest.fn();
  const create = jest.fn();

  // beforeEach runs before every single test.
  beforeEach(() => {
    // clear the records and the fake answers from the last test.
    jest.resetAllMocks();
    // a fake prisma object with only the two functions the service uses. no real database is touched.
    const fakePrisma = { user: { findFirst, create } } as unknown as PrismaService;
    service = new UsersService(fakePrisma);
  });

  // tests for the select objects, which decide what can leave the service.
  describe('select shapes', () => {
    // the safe shape is what other people may see.
    it('keeps email and password hash out of the safe shape', () => {
      const keys = Object.keys(SAFE_USER_SELECT);
      // safety: these two fields must never be in the shape that is shown to others.
      expect(keys).not.toContain('email');
      expect(keys).not.toContain('passwordHash');
    });

    // the own shape adds the email but still never the hash.
    it('adds the email but not the password hash to the own shape', () => {
      const keys = Object.keys(OWN_USER_SELECT);
      expect(keys).toContain('email');
      expect(keys).not.toContain('passwordHash');
    });

    // the guard shape must stay small, because it runs on every request.
    it('keeps the auth state shape to id, role, and status only', () => {
      expect(Object.keys(AUTH_STATE_USER_SELECT).sort()).toEqual(['id', 'role', 'status']);
    });
  });

  // tests for the login lookup.
  describe('findForLogin', () => {
    // the email is cleaned and deleted accounts are skipped.
    it('searches a lowercase email and skips deleted accounts', async () => {
      findFirst.mockResolvedValue(null);

      await service.findForLogin('  Ana@StudyCircle.TEST ');

      // the search must use the cleaned email and the "not deleted" filter.
      expect(findFirst).toHaveBeenCalledWith({
        where: { email: 'ana@studycircle.test', deletedAt: null },
        select: LOGIN_USER_SELECT,
      });
    });

    // an unknown email gives null, not an error, so the auth service can give one general message.
    it('returns null when no account matches', async () => {
      findFirst.mockResolvedValue(null);

      await expect(service.findForLogin('nobody@studycircle.test')).resolves.toBeNull();
    });
  });

  // tests for the lookups by id.
  describe('lookups by id', () => {
    // the guard lookup skips deleted accounts.
    it('findAuthStateById skips deleted accounts', async () => {
      findFirst.mockResolvedValue(null);

      await service.findAuthStateById(5);

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: AUTH_STATE_USER_SELECT,
      });
    });

    // the safe lookup uses the safe shape.
    it('findSafeById uses the safe shape', async () => {
      findFirst.mockResolvedValue(null);

      await service.findSafeById(5);

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: SAFE_USER_SELECT,
      });
    });

    // the own lookup uses the own shape.
    it('findOwnById uses the own shape', async () => {
      findFirst.mockResolvedValue(null);

      await service.findOwnById(5);

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: OWN_USER_SELECT,
      });
    });
  });

  // tests for creating a student.
  describe('createStudent', () => {
    // the saved data must have a lowercase email and the student role.
    it('saves a lowercase email and always the student role', async () => {
      // pretend the database created the row and returned the safe fields.
      create.mockResolvedValue({ id: 1, name: 'Ana', role: Role.student });

      const result = await service.createStudent({
        name: 'Ana',
        email: 'Ana@StudyCircle.TEST',
        passwordHash: 'fake_hash_for_test',
        department: 'CSE',
        academicYear: 2,
      });

      expect(create).toHaveBeenCalledWith({
        data: {
          name: 'Ana',
          email: 'ana@studycircle.test',
          passwordHash: 'fake_hash_for_test',
          role: Role.student,
          department: 'CSE',
          academicYear: 2,
        },
        select: SAFE_USER_SELECT,
      });
      // the service returns what the database gave back.
      expect(result).toEqual({ id: 1, name: 'Ana', role: Role.student });
    });

    // extra fields such as role must not get through, even when a caller sends them by mistake.
    it('ignores a role that a caller tries to pass in', async () => {
      create.mockResolvedValue({ id: 2 });

      // the cast simulates a bad caller that sends a field the type does not allow.
      await service.createStudent({
        name: 'Eve',
        email: 'eve@studycircle.test',
        passwordHash: 'fake_hash_for_test',
        role: Role.admin,
      } as never);

      // safety: the saved role must still be student.
      const saved = create.mock.calls[0][0].data;
      expect(saved.role).toBe(Role.student);
    });
  });
});