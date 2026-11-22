// imports: "createParamDecorator" builds a decorator for a route parameter. the other two are the error and the context types.
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import: the fixed role words from the generated client.
import { Role } from '../../generated/prisma/client';
// import: the one shared "not logged in" message from the login guard (tracker item 68).
// using the same constant means there is only one copy of the text in the code, so the two places can never drift apart.
// note: the guard also imports from this file, but only a type (AuthUser), and the built code drops type-only imports.
// so the two files never load each other in a loop at run time.
import { UNAUTHENTICATED_MESSAGE } from '../guards/jwt-auth.guard';

// who the logged-in person is, as the guard found out. it holds only the id and the role.
export interface AuthUser {
  userId: number;
  role: Role;
}

// reads the logged-in person from the request. this is the inner function of @CurrentUser().
// it is exported on its own so a unit test can call it directly, because a finished decorator cannot be called like a normal function.
// "_data" is the value written inside the brackets, like @CurrentUser('x'). it is not used, and the "_" at the start says so on purpose.
export function currentUserFactory(_data: unknown, context: ExecutionContext): AuthUser {
  // get the request object. the login guard put the person on it.
  const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();

  // safety: no person means the guard did not run, for example on a route marked @Public().
  // stop here instead of returning nothing, so a mistake can never act as "no user, no check".
  // the message is the same one the guard uses, so the reply looks the same whichever part stopped the request.
  if (!request.user) {
    throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);
  }

  // the person is there, so give it to the route.
  return request.user;
}

// @CurrentUser() gives a route the logged-in person, so the route never reads an id from the request body or address.
// "createParamDecorator" wraps the function above and turns it into a decorator for a route parameter.
// safety: always use this for "who is calling". an id sent by the client can be faked, and this value cannot.
export const CurrentUser = createParamDecorator(currentUserFactory);