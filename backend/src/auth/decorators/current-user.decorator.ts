// imports: "createParamDecorator" builds a decorator for a route parameter. the other two are the error and the context types.
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import: the fixed role words from the generated client.
import { Role } from '../../generated/prisma/client';

// who the logged-in person is, as the guard found out. it holds only the id and the role.
export interface AuthUser {
  userId: number;
  role: Role;
}

// @CurrentUser() gives a route the logged-in person, so the route never reads an id from the request body or address.
// safety: always use this for "who is calling". an id sent by the client can be faked, and this value cannot.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  // get the request object. the login guard put the person on it.
  const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();

  // safety: no person means the guard did not run, for example on a route marked @Public().
  // stop here instead of returning nothing, so a mistake can never act as "no user, no check".
  if (!request.user) {
    throw new UnauthorizedException('please log in to continue');
  }

  return request.user;
});