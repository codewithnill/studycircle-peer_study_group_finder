// imports: the context type and the 403 error type.
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
// import: the real reflector. the tests use real decorators on a small demo class, so the decorators are tested too.
import { Reflector } from '@nestjs/core';
// import: the fixed role words from the generated client.
import { Role } from '../../generated/prisma/client';
// import: the decorator under test.
import { Roles } from '../decorators/roles.decorator';
// import: the guard under test and its message.
import { FORBIDDEN_MESSAGE, RolesGuard } from './roles.guard';

// a tiny demo class with methods that need different roles.
// the tests never call these methods. they only hand them to the fake context, so the guard can read the @Roles() mark.
// "this: void" says the method never uses "this". so passing the method around on its own (DemoController.prototype.adminOnly)
// is safe, and the lint rule "unbound-method" has nothing to warn about.
class DemoController {
  anyone(this: void): void {}

  @Roles(Role.admin)
  adminOnly(this: void): void {}

  @Roles(Role.admin, Role.student)
  adminOrStudent(this: void): void {}
}

// builds a fake context for one method of the demo class, with the given person on the request.
const makeContext = (user: { userId: number; role: Role } | undefined, handler: () => void): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => DemoController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

// a group of tests for the roles guard.
describe('RolesGuard', () => {
  // the guard is built with the real reflector.
  const guard = new RolesGuard(new Reflector());

  // a route without @Roles() lets any logged-in person in.
  it('lets any person in when the route lists no roles', () => {
    const context = makeContext({ userId: 1, role: Role.student }, DemoController.prototype.anyone);

    expect(guard.canActivate(context)).toBe(true);
  });

  // a matching role is allowed.
  it('lets a person with a listed role in', () => {
    const context = makeContext({ userId: 1, role: Role.admin }, DemoController.prototype.adminOnly);

    expect(guard.canActivate(context)).toBe(true);
  });

  // a role that is not listed gets a 403 reply.
  it('refuses a person with another role with a 403 error', () => {
    const context = makeContext({ userId: 1, role: Role.student }, DemoController.prototype.adminOnly);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(FORBIDDEN_MESSAGE);
  });

  // a route can list more than one role.
  it('accepts any of several listed roles', () => {
    const asStudent = makeContext({ userId: 1, role: Role.student }, DemoController.prototype.adminOrStudent);
    const asAdmin = makeContext({ userId: 2, role: Role.admin }, DemoController.prototype.adminOrStudent);

    expect(guard.canActivate(asStudent)).toBe(true);
    expect(guard.canActivate(asAdmin)).toBe(true);
  });

  // safety: a route that needs a role must never open for a request without a person.
  it('refuses a route that needs a role when there is no person', () => {
    const context = makeContext(undefined, DemoController.prototype.adminOnly);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});