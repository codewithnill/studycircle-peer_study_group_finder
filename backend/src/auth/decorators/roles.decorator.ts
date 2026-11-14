// import: "SetMetadata" attaches a small mark to a route. a guard can read that mark later.
import { SetMetadata } from '@nestjs/common';
// import: the fixed role words from the generated client (student, admin). they are never typed by hand.
import { Role } from '../../generated/prisma/client';

// the name of the mark. the roles guard reads the same name, so it is kept in one place.
export const ROLES_KEY = 'roles';

// @Roles(Role.admin) lists the global roles that may enter a route. any other role gets a 403 reply.
// this covers only the global roles. the group leader is a role inside one group and has its own guard later.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);