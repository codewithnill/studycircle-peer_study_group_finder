// import: the context type, so the fake context has the right shape, and the 401 error class to compare against.
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import: the fixed role words from the generated client, so the test user has a real role and not a hand-typed one.
import { Role } from '../../generated/prisma/client';
// import: the shared message from the guard. the test compares against this constant, not a written-out text.
import { UNAUTHENTICATED_MESSAGE } from '../guards/jwt-auth.guard';
// import: the person shape and the inner function of @CurrentUser() that is under test.
import { AuthUser, currentUserFactory } from './current-user.decorator';

// builds a fake execution context that gives back the given request.
// the real context is large, but the function under test only calls switchToHttp().getRequest(), so only that part is faked.
// "as unknown as ExecutionContext" tells typescript to accept the small fake in place of the full type.
function contextWith(request: { user?: AuthUser }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// these tests check the inner function of @CurrentUser() (tracker item 68).
// describe, it and expect are jest tools. they are available without an import.
describe('currentUserFactory', () => {
  // the normal case: the guard has run and put the person on the request.
  it('gives back the person that the guard put on the request', () => {
    // a made-up person with a real role word.
    const user: AuthUser = { userId: 7, role: Role.student };

    // the function must give back exactly that person.
    expect(currentUserFactory(undefined, contextWith({ user }))).toEqual(user);
  });

  // the mistake case: a route forgot its guard, so no person is on the request.
  // safety: the function must stop with a 401 and never let the route run with no user.
  it('throws a 401 with the shared message when no person is on the request', () => {
    // the error is caught by hand, so its class, status and message can all be checked one by one.
    let caught: unknown;
    try {
      currentUserFactory(undefined, contextWith({}));
    } catch (error) {
      caught = error;
    }

    // it must be the nestjs 401 error class.
    expect(caught).toBeInstanceOf(UnauthorizedException);
    // the http status must be 401 (not logged in).
    expect((caught as UnauthorizedException).getStatus()).toBe(401);
    // the message must be the exact shared constant, so the decorator and the guard always say the same thing.
    expect((caught as UnauthorizedException).message).toBe(UNAUTHENTICATED_MESSAGE);
  });
});