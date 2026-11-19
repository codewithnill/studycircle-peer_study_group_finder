// import: the errors the service throws, so the tests can check the exact kind.
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
// import: the service and the select objects that are tested.
import {
  AUTH_STATE_USER_SELECT,
  LOGIN_USER_SELECT,
  OWN_PROFILE_SELECT,
  OWN_USER_SELECT,
  PUBLIC_PROFILE_SELECT,
  SAFE_USER_SELECT,
  UsersService,
} from './users.service';
// import: the type of the database connection. it is only used as a type here, so no real connection is made.
import { PrismaService } from '../prisma/prisma.service';
// import: the fixed role and status words, and the prisma tools for the error class and the transaction level.
import { Prisma, Role, UserStatus } from '../generated/prisma/client';
// import: the profile limit and the messages, so the tests check the same text the service sends.
import {
  MAX_SUBJECTS_PER_USER,
  NOTHING_TO_UPDATE_MESSAGE,
  PROFILE_NOT_FOUND_MESSAGE,
  SUBJECT_ALREADY_ADDED_MESSAGE,
  SUBJECT_LIMIT_MESSAGE,
  SUBJECT_NOT_FOUND_MESSAGE,
  SUBJECT_NOT_IN_LIST_MESSAGE,
} from './users.constants';
// import: the input shape of the profile edit, used only as a type for the fake inputs.
import type { UpdateProfileDto } from './dto/update-profile.dto';

// a fake database row of a profile, as prisma would give it with the own profile select.
const ownRow = {
  id: 7,
  name: 'Ana',
  department: 'CSE',
  academicYear: 2,
  bio: null,
  email: 'ana@example.com',
  role: Role.student,
  userSubjects: [{ subject: { id: 3, name: 'Calculus' } }, { subject: { id: 1, name: 'Data Structures' } }],
};

// a group of tests for the users service.
describe('UsersService', () => {
  // the service under test. it is rebuilt before every test, so no test sees leftovers of another.
  let service: UsersService;
  // fake database functions. jest.fn() makes a function that records how it was called.
  const userFindFirst = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const subjectFindFirst = jest.fn();
  const linkFindUnique = jest.fn();
  const linkCount = jest.fn();
  const linkCreate = jest.fn();
  const linkDeleteMany = jest.fn();
  const transaction = jest.fn();

  // beforeEach runs before every single test.
  beforeEach(() => {
    // clear the records and the fake answers from the last test.
    jest.resetAllMocks();
    // a fake prisma object with only the functions the service uses. no real database is touched.
    const fakePrisma = {
      user: { findFirst: userFindFirst, create: userCreate, update: userUpdate },
      subject: { findFirst: subjectFindFirst },
      userSubject: {
        findUnique: linkFindUnique,
        count: linkCount,
        create: linkCreate,
        deleteMany: linkDeleteMany,
      },
      $transaction: transaction,
    };
    // the fake transaction simply runs the given function with the same fake object as "tx".
    // it is set again after resetAllMocks, because the reset removes every fake answer.
    transaction.mockImplementation((work: (tx: typeof fakePrisma) => Promise<unknown>) =>
      work(fakePrisma),
    );
    service = new UsersService(fakePrisma as unknown as PrismaService);
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

    // safety: the public profile is what strangers see. it lists exactly these fields and nothing more.
    it('keeps the public profile to safe fields and active subjects only', () => {
      expect(Object.keys(PUBLIC_PROFILE_SELECT).sort()).toEqual([
        'academicYear',
        'bio',
        'department',
        'id',
        'name',
        'userSubjects',
      ]);
      // hidden subjects must never be read.
      expect(PUBLIC_PROFILE_SELECT.userSubjects.where).toEqual({ subject: { isActive: true } });
      // the own profile adds only the email and the role, never the hash or the status.
      const ownKeys = Object.keys(OWN_PROFILE_SELECT);
      expect(ownKeys).toEqual(expect.arrayContaining(['email', 'role']));
      expect(ownKeys).not.toContain('passwordHash');
      expect(ownKeys).not.toContain('status');
    });
  });

  // tests for the login lookup.
  describe('findForLogin', () => {
    // the email is cleaned and deleted accounts are skipped.
    it('searches a lowercase email and skips deleted accounts', async () => {
      userFindFirst.mockResolvedValue(null);

      await service.findForLogin('  Ana@StudyCircle.TEST ');

      // the search must use the cleaned email and the "not deleted" filter.
      expect(userFindFirst).toHaveBeenCalledWith({
        where: { email: 'ana@studycircle.test', deletedAt: null },
        select: LOGIN_USER_SELECT,
      });
    });

    // an unknown email gives null, not an error, so the auth service can give one general message.
    it('returns null when no account matches', async () => {
      userFindFirst.mockResolvedValue(null);

      await expect(service.findForLogin('nobody@studycircle.test')).resolves.toBeNull();
    });
  });

  // tests for the lookups by id.
  describe('lookups by id', () => {
    // the guard lookup skips deleted accounts.
    it('findAuthStateById skips deleted accounts', async () => {
      userFindFirst.mockResolvedValue(null);

      await service.findAuthStateById(5);

      expect(userFindFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: AUTH_STATE_USER_SELECT,
      });
    });

    // the safe lookup uses the safe shape.
    it('findSafeById uses the safe shape', async () => {
      userFindFirst.mockResolvedValue(null);

      await service.findSafeById(5);

      expect(userFindFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        select: SAFE_USER_SELECT,
      });
    });

    // the own lookup uses the own shape.
    it('findOwnById uses the own shape', async () => {
      userFindFirst.mockResolvedValue(null);

      await service.findOwnById(5);

      expect(userFindFirst).toHaveBeenCalledWith({
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
      userCreate.mockResolvedValue({ id: 1, name: 'Ana', role: Role.student });

      const result = await service.createStudent({
        name: 'Ana',
        email: 'Ana@StudyCircle.TEST',
        passwordHash: 'fake_hash_for_test',
        department: 'CSE',
        academicYear: 2,
      });

      expect(userCreate).toHaveBeenCalledWith({
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
      userCreate.mockResolvedValue({ id: 2 });

      // the cast simulates a bad caller that sends a field the type does not allow.
      await service.createStudent({
        name: 'Eve',
        email: 'eve@studycircle.test',
        passwordHash: 'fake_hash_for_test',
        role: Role.admin,
      } as never);

      // safety: the saved role must still be student.
      const saved = userCreate.mock.calls[0][0].data;
      expect(saved.role).toBe(Role.student);
    });
  });

  // tests for reading the person's own profile.
  describe('getOwnProfile', () => {
    // the row is read with the own shape, and the link rows become a plain subject list.
    it('uses the own shape and flattens the subjects', async () => {
      userFindFirst.mockResolvedValue(ownRow);

      const profile = await service.getOwnProfile(7);

      expect(userFindFirst).toHaveBeenCalledWith({
        where: { id: 7, deletedAt: null },
        select: OWN_PROFILE_SELECT,
      });
      expect(profile).toEqual({
        id: 7,
        name: 'Ana',
        department: 'CSE',
        academicYear: 2,
        bio: null,
        email: 'ana@example.com',
        role: Role.student,
        subjects: [
          { id: 3, name: 'Calculus' },
          { id: 1, name: 'Data Structures' },
        ],
      });
      // the database link rows must not reach the reply.
      expect(profile).not.toHaveProperty('userSubjects');
    });

    // a deleted account gives null, so the controller can reply 401.
    it('returns null when the account is gone', async () => {
      userFindFirst.mockResolvedValue(null);

      await expect(service.getOwnProfile(7)).resolves.toBeNull();
    });
  });

  // tests for reading another person's public profile.
  describe('getPublicProfile', () => {
    // safety: only live and active accounts may be found.
    it('looks only for a live, active account with the public shape', async () => {
      const { email: _email, role: _role, ...publicRow } = ownRow;
      userFindFirst.mockResolvedValue(publicRow);

      const profile = await service.getPublicProfile(7);

      expect(userFindFirst).toHaveBeenCalledWith({
        where: { id: 7, deletedAt: null, status: UserStatus.active },
        select: PUBLIC_PROFILE_SELECT,
      });
      expect(profile).not.toHaveProperty('email');
      expect(profile).not.toHaveProperty('role');
      expect(profile.subjects).toHaveLength(2);
    });

    // an unknown, suspended, or deleted account all give the same 404.
    it('gives 404 with the profile message when no account matches', async () => {
      userFindFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile(99)).rejects.toThrow(
        new NotFoundException(PROFILE_NOT_FOUND_MESSAGE),
      );
    });
  });

  // tests for changing the person's own profile.
  describe('updateOwnProfile', () => {
    // an empty body changes nothing, so it is refused before the database is asked.
    it('gives 400 for an empty change and never calls the database', async () => {
      await expect(service.updateOwnProfile(7, {} as UpdateProfileDto)).rejects.toThrow(
        new BadRequestException(NOTHING_TO_UPDATE_MESSAGE),
      );
      expect(userUpdate).not.toHaveBeenCalled();
    });

    // safety: only the four allowed fields reach the database, and only for the given id.
    it('sends only the four allowed fields for the logged-in id', async () => {
      userUpdate.mockResolvedValue(ownRow);

      // the cast simulates a field that somehow got past the validation pipe.
      await service.updateOwnProfile(7, { name: 'Ana R', role: Role.admin } as UpdateProfileDto);

      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: 7, deletedAt: null },
        data: { name: 'Ana R', department: undefined, academicYear: undefined, bio: undefined },
        select: OWN_PROFILE_SELECT,
      });
    });

    // null is passed on, because null means "clear this field".
    it('passes null on to clear a field', async () => {
      userUpdate.mockResolvedValue(ownRow);

      await service.updateOwnProfile(7, { bio: null } as UpdateProfileDto);

      expect(userUpdate.mock.calls[0][0].data.bio).toBeNull();
    });
  });

  // tests for adding a subject of interest.
  describe('addSubject', () => {
    // a missing or hidden subject gives 404. the search asks for an active subject only.
    it('gives 404 for an unknown or inactive subject', async () => {
      subjectFindFirst.mockResolvedValue(null);

      await expect(service.addSubject(7, 3)).rejects.toThrow(
        new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE),
      );
      expect(subjectFindFirst.mock.calls[0][0].where).toEqual({ id: 3, isActive: true });
      expect(linkCreate).not.toHaveBeenCalled();
    });

    it('gives 409 when the subject is already in the list', async () => {
      subjectFindFirst.mockResolvedValue({ id: 3, name: 'Calculus' });
      linkFindUnique.mockResolvedValue({ userId: 7 });

      await expect(service.addSubject(7, 3)).rejects.toThrow(
        new ConflictException(SUBJECT_ALREADY_ADDED_MESSAGE),
      );
      expect(linkCreate).not.toHaveBeenCalled();
    });

    it('gives 409 when the list is full', async () => {
      subjectFindFirst.mockResolvedValue({ id: 3, name: 'Calculus' });
      linkFindUnique.mockResolvedValue(null);
      linkCount.mockResolvedValue(MAX_SUBJECTS_PER_USER);

      await expect(service.addSubject(7, 3)).rejects.toThrow(
        new ConflictException(SUBJECT_LIMIT_MESSAGE),
      );
      expect(linkCreate).not.toHaveBeenCalled();
    });

    // the normal case: the link row is saved inside a serializable transaction, and the subject comes back.
    it('saves the link in a serializable transaction and gives the subject back', async () => {
      subjectFindFirst.mockResolvedValue({ id: 3, name: 'Calculus' });
      linkFindUnique.mockResolvedValue(null);
      linkCount.mockResolvedValue(2);

      await expect(service.addSubject(7, 3)).resolves.toEqual({ id: 3, name: 'Calculus' });
      expect(linkCreate).toHaveBeenCalledWith({ data: { userId: 7, subjectId: 3 } });
      expect(transaction.mock.calls[0][1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    // two requests at the same moment: the primary key refuses the second insert with P2002.
    it('turns a P2002 duplicate into the exact 409 message', async () => {
      subjectFindFirst.mockResolvedValue({ id: 3, name: 'Calculus' });
      linkFindUnique.mockResolvedValue(null);
      linkCount.mockResolvedValue(2);
      linkCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.addSubject(7, 3)).rejects.toThrow(
        new ConflictException(SUBJECT_ALREADY_ADDED_MESSAGE),
      );
    });
  });

  // tests for removing a subject of interest.
  describe('removeSubject', () => {
    // safety: the delete condition holds the person's own id, so nobody can remove another person's row.
        it('deletes only the own link row of the logged-in person', async () => {
      linkDeleteMany.mockResolvedValue({ count: 1 });

      await service.removeSubject(7, 3);

      expect(linkDeleteMany).toHaveBeenCalledWith({ where: { userId: 7, subjectId: 3 } });
    });

    it('gives 404 when the subject is not in the list', async () => {
      linkDeleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeSubject(7, 3)).rejects.toThrow(
        new NotFoundException(SUBJECT_NOT_IN_LIST_MESSAGE),
      );
    });
  });
});