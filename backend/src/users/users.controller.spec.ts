// import: the 401 error, so the test can check the exact kind.
import { UnauthorizedException } from '@nestjs/common';
// import: the controller under test.
import { UsersController } from './users.controller';
// import: the type of the users service. only the type is used, so no real service or database is made.
import { UsersService } from './users.service';
// import: the type of the logged-in person, and the fixed role words.
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';
// import: the guard's message, so the test checks the same text the controller sends.
import { UNAUTHENTICATED_MESSAGE } from '../auth/guards/jwt-auth.guard';
// import: the input shapes, used as types for the fake inputs.
import type { AddSubjectDto } from './dto/add-subject.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

// the logged-in person, as the guard would give it.
const user: AuthUser = { userId: 7, role: Role.student };

// a group of tests for the users controller.
// the controller must only pass the cookie's user id and the checked input on to the service.
describe('UsersController', () => {
  // the controller under test, rebuilt before every test.
  let controller: UsersController;
  // fake service functions. jest.fn() records how each one was called.
  const getOwnProfile = jest.fn();
  const updateOwnProfile = jest.fn();
  const addSubject = jest.fn();
  const removeSubject = jest.fn();
  const getPublicProfile = jest.fn();

  // beforeEach runs before every single test.
  beforeEach(() => {
    // clear the records and the fake answers from the last test.
    jest.resetAllMocks();
    // a fake service with only the functions the controller uses.
    const fakeService = { getOwnProfile, updateOwnProfile, addSubject, removeSubject, getPublicProfile };
    controller = new UsersController(fakeService as unknown as UsersService);
  });

  // the own profile is read with the id from the cookie.
  it('gives the own profile of the logged-in person', async () => {
    getOwnProfile.mockResolvedValue({ id: 7, name: 'Ana' });

    await expect(controller.getOwnProfile(user)).resolves.toEqual({ id: 7, name: 'Ana' });
    expect(getOwnProfile).toHaveBeenCalledWith(7);
  });

  // an account deleted a moment ago gets the same reply as "not logged in".
  it('gives 401 with the guard message when the own account is gone', async () => {
    getOwnProfile.mockResolvedValue(null);

    await expect(controller.getOwnProfile(user)).rejects.toThrow(
      new UnauthorizedException(UNAUTHENTICATED_MESSAGE),
    );
  });

  // safety: the update always uses the cookie's id, never an id from the request.
  it('passes the logged-in id and the body to the update', async () => {
    const dto = { bio: 'Hello' } as UpdateProfileDto;
    updateOwnProfile.mockResolvedValue({ id: 7 });

    await controller.updateOwnProfile(user, dto);

    expect(updateOwnProfile).toHaveBeenCalledWith(7, dto);
  });

  it('passes the logged-in id and the subject id to add a subject', async () => {
    addSubject.mockResolvedValue({ id: 3, name: 'Calculus' });

    await expect(controller.addSubject(user, { subjectId: 3 } as AddSubjectDto)).resolves.toEqual({
      id: 3,
      name: 'Calculus',
    });
    expect(addSubject).toHaveBeenCalledWith(7, 3);
  });

  // the delete gives back nothing, so the reply wrapper sends { data: null }.
  it('passes the logged-in id and the subject id to remove a subject, and gives nothing back', async () => {
    removeSubject.mockResolvedValue(undefined);

    await expect(controller.removeSubject(user, 3)).resolves.toBeUndefined();
    expect(removeSubject).toHaveBeenCalledWith(7, 3);
  });

  // the public profile uses the id from the address, which the safe id pipe has already checked.
  it('passes the id from the address to the public profile', async () => {
    getPublicProfile.mockResolvedValue({ id: 12, name: 'Rafi' });

    await controller.getPublicProfile(12);

    expect(getPublicProfile).toHaveBeenCalledWith(12);
  });
});