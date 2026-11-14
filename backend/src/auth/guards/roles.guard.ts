// imports: the guard interface, the injectable mark, the context type, and the 403 error.
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
// import: reflector reads the marks that decorators such as @Roles() put on a route.
import { Reflector } from '@nestjs/core';
// import: the fixed role words from the generated client.
import { Role } from '../../generated/prisma/client';
// import: the type of the person on the request, and the mark name.
import { AuthUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

// the message when a logged-in person has the wrong role.
export const FORBIDDEN_MESSAGE = 'you do not have permission to do this';

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// the roles guard. it runs after the login guard, so the person is already on the request.
// it checks only the global roles (student, admin). the group leader has its own guard later.
export class RolesGuard implements CanActivate {
  // the constructor receives the reflector from nestjs.
  constructor(private readonly reflector: Reflector) {}

  // decides whether the person's role may enter the route.
  canActivate(context: ExecutionContext): boolean {
    // look for the @Roles() mark on the method first, then on the class.
    const allowedRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // no mark (or an empty list) means any logged-in person may enter. the login guard already checked who they are.
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // get the person that the login guard put on the request.
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    // safety: a route that needs a role must never open for a request without a person.
    // this can only happen when a route has both @Public() and @Roles(), which is a mistake, so it fails closed.
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }

    return true;
  }
}