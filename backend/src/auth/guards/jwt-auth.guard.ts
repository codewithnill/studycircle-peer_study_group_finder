// imports: the guard interface, the injectable mark, the context type, and the 401 error.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
// import: reflector reads the marks that decorators such as @Public() put on a route.
import { Reflector } from '@nestjs/core';
// import: the fixed words for the account state (active, suspended) from the generated client.
import { UserStatus } from '../../generated/prisma/client';
// import: the users service finds the account in the database.
import { UsersService } from '../../users/users.service';
// import: the cookie name and the token service.
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';
import { TokenService } from '../token.service';
// import type: the shape of the person that this guard puts on the request.
// "import type" borrows only the shape, so the built code has no import of the decorator file at all.
// this matters because the decorator file imports UNAUTHENTICATED_MESSAGE from here. a type-only import keeps the two files from loading each other in a loop.
import type { AuthUser } from '../decorators/current-user.decorator';
// import: the mark name that @Public() puts on a route.
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// the one message for every failure here: no cookie, a bad token, an expired token, a suspended or deleted account.
// it starts with a capital letter, like every message in the api shape rules (section 3).
// @CurrentUser() uses this same constant for its own fallback 401 (tracker item 68).
// safety: a different message for each case would tell an attacker what went wrong with a stolen or forged token.
export const UNAUTHENTICATED_MESSAGE = 'Please log in to continue';

// the parts of the request that this guard uses. the cookie reader (cookie-parser) fills "cookies".
interface AuthRequest {
  cookies?: Record<string, unknown>;
  user?: AuthUser;
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// the login guard. it runs on every route (it is registered globally in the auth module).
// it lets a route in only when the access token is real and the account is still active.
export class JwtAuthGuard implements CanActivate {
  // the constructor receives three helpers from nestjs.
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  // decides whether a request may enter a route. returning true lets it in. throwing an error stops it.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // look for the @Public() mark on the method first, then on the class.
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // a public route needs no login.
    if (isPublic) {
      return true;
    }

    // get the request. "cookies" can be missing when no cookie was sent.
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE];

    // no token, or a value that is not a text, means the person is not logged in.
    if (typeof token !== 'string' || token === '') {
      throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);
    }

    // check the signature and the expiry date. a bad token gives null.
    const verified = await this.tokens.verifyAccessToken(token);
    if (!verified) {
      throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);
    }

    // ask the database about the account. a valid token alone is not enough.
    // safety: a token stays valid for up to 15 minutes. without this check, a suspended or deleted person would keep working until then.
    const account = await this.users.findAuthStateById(verified.userId);
    if (!account || account.status !== UserStatus.active) {
      throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);
    }

    // put the person on the request, so routes can read it with @CurrentUser().
    // safety: the role comes from the database and not from the token, so a role change works at once.
    request.user = { userId: account.id, role: account.role };

    return true;
  }
}