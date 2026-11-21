// import type: the person shape, the two dto shapes, and the service shape. only types are borrowed here.
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { CreateGroupDto } from './dto/create-group.dto';
import type { UpdateGroupDto } from './dto/update-group.dto';
import type { GroupsService } from './groups.service';
// import: the fixed role words, so the made-up person has a real role.
import { Role } from '../generated/prisma/client';
// import: the controller under test.
import { GroupsController } from './groups.controller';

// a made-up logged-in person, as the login guard would give it.
const USER: AuthUser = { userId: 7, role: Role.student };

// builds the controller with a fake service. every call is saved in "calls",
// so a test can check that the controller passed the right person, id, and body.
function makeController() {
  const calls: unknown[][] = [];
  const fakeService = {
    createGroup: (...args: unknown[]) => {
      calls.push(['createGroup', ...args]);
      return Promise.resolve({ id: 1 });
    },
    getGroup: (...args: unknown[]) => {
      calls.push(['getGroup', ...args]);
      return Promise.resolve({ id: 12 });
    },
    updateGroup: (...args: unknown[]) => {
      calls.push(['updateGroup', ...args]);
      return Promise.resolve({ id: 12 });
    },
  };
  // "as unknown as GroupsService" tells typescript to accept the small fake in place of the full service.
  return { controller: new GroupsController(fakeService as unknown as GroupsService), calls };
}

// describe, it and expect are jest tools. they are available without an import.
describe('GroupsController', () => {
  // safety: the leader id must be the logged-in person's id, never a value from the body.
  it('creates a group with the logged-in person as the leader', async () => {
    const { controller, calls } = makeController();
    const dto = { title: 'Calculus' } as CreateGroupDto;

    await expect(controller.createGroup(USER, dto)).resolves.toEqual({ id: 1 });
    expect(calls).toEqual([['createGroup', 7, dto]]);
  });

  // the group id from the address and the viewer's id both reach the service.
  it('reads one group for the logged-in person', async () => {
    const { controller, calls } = makeController();

    await expect(controller.getGroup(USER, 12)).resolves.toEqual({ id: 12 });
    expect(calls).toEqual([['getGroup', 12, 7]]);
  });

  // the group id, the person's id, and the body all reach the service, in that order.
  it('passes the group id, the person and the body to the edit', async () => {
    const { controller, calls } = makeController();
    const dto = { maxSize: 8 } as UpdateGroupDto;

    await expect(controller.updateGroup(USER, 12, dto)).resolves.toEqual({ id: 12 });
    expect(calls).toEqual([['updateGroup', 12, 7, dto]]);
  });
});