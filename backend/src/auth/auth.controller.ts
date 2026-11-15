// imports: the decorators for the controller, the routes, the status code, and the request parts. "UnauthorizedException" is the 401 error.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
// import: configservice reads values from the .env file.
import { ConfigService } from '@nestjs/config';
// import: "Throttle" sets a rate limit on one route. it does nothing until the throttler module is added (a later step).
import { Throttle } from '@nestjs/throttler';
// import: only the type of the express response. "import type" is required here, because the type sits in a decorated parameter.
import type { Response } from 'express';
// import: the users service reads the logged-in person's own data.
import { UsersService } from '../users/users.service';
// import: the helpers that set and clear the cookies, and the refresh cookie name.
import { clearAuthCookies, setAuthCookies } from './auth-cookies';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
// import: the auth service does the real work.
import { AuthService } from './auth.service';
// import: the three decorators made earlier.
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
// import: the two input shapes. they are classes, so the validation pipe can check the body against their rules.
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// the part of the request that this file reads. the cookie reader (cookie-parser) fills "cookies".
interface CookieRequest {
  cookies?: Record<string, unknown>;
}

// @Controller('auth') makes every route in this class start with "auth".
// the global prefix adds "/api/v1" in front, so the routes are /api/v1/auth/...
@Controller('auth')
// the auth controller. it stays thin on purpose: read the input, call the service, set or clear cookies.
// every rule about passwords and tokens lives in the auth service.
export class AuthController {
  // true only in production. it decides the "secure" flag of the cookies.
  // safety: a server that is live but has NODE_ENV unset would send cookies without "secure". set NODE_ENV=production on the live server.
  private readonly secureCookies: boolean;

  // the constructor receives the helpers from nestjs.
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    config: ConfigService,
  ) {
    this.secureCookies = config.get<string>('NODE_ENV') === 'production';
  }

  // creates a student account. it sets no cookies, so the frontend calls login next.
  // @Public() lets a person who is not logged in call this route.
  // @Throttle() limits this route to 5 calls per minute for one address (the time is in milliseconds).
  // @Post('register') answers to POST /api/v1/auth/register.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  // @Body() hands over the whole body as one dto object, after the pipes checked it.
  // the reply holds only the safe fields, never the email or the password hash.
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // checks the email and password, then sets both cookies.
  // @HttpCode(200) is used because login does not create anything, so "201 created" would be wrong.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  // @Res({ passthrough: true }) gives access to the response so cookies can be set, and nestjs still sends the returned value.
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    // the service checks the credentials and gives the user and both raw tokens.
    const { user, accessToken, refreshToken } = await this.auth.login(dto);

    // the tokens go into cookies only.
    // safety: they are never put in the json reply, because page javascript can read a json reply but not an httponly cookie.
    setAuthCookies(res, { accessToken, refreshToken }, this.secureCookies);

    // the reply is the person's own data, so the frontend can show the name at once.
    return user;
  }

  // swaps the refresh cookie for two new cookies. every refresh token works only once.
  // the access token may be expired when this is called, so the route is public. the refresh token is the proof.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: CookieRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    try {
      // the service checks the token, rotates it, and gives two new tokens.
      const tokens = await this.auth.refresh(this.readRefreshCookie(req));
      setAuthCookies(res, tokens, this.secureCookies);
    } catch (error) {
      // a refused refresh means the cookies are useless, so they are cleared. the browser then stops sending them.
      // other errors (for example a database problem) do not clear the cookies, because the person may still be logged in.
      if (error instanceof UnauthorizedException) {
        clearAuthCookies(res, this.secureCookies);
      }
      // pass the error on. the shared filter turns it into the error reply.
      throw error;
    }
  }

  // cancels the refresh token and clears both cookies.
  // the route is public, so logout still works when the access token has already expired.
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: CookieRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    // cancel the token in the database. the service never fails, even with no cookie.
    await this.auth.logout(this.readRefreshCookie(req));
    // clear the cookies in the browser.
    clearAuthCookies(res, this.secureCookies);
  }

  // gives the logged-in person's own data. there is no @Public(), so the login guard protects this route.
  @Get('me')
  // @CurrentUser() gives the person that the login guard found.
  // safety: the id comes from the guard and never from the request address or body, so nobody can ask for another person's data.
  async me(@CurrentUser() user: AuthUser) {
    const own = await this.users.findOwnById(user.userId);

    // the account could have been deleted a moment ago.
    if (!own) {
      throw new UnauthorizedException('please log in to continue');
    }

    return own;
  }

  // reads the refresh token from the cookies. it gives undefined when the cookie is missing or is not a text.
  private readRefreshCookie(req: CookieRequest): string | undefined {
    const value = req.cookies?.[REFRESH_TOKEN_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }
}