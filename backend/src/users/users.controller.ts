// imports: the decorators for the controller, the routes, and the request parts. "UnauthorizedException" is the 401 error.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
// import: the decorator that gives the logged-in person, and its type.
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
// import: the one "not logged in" message from the login guard, so the same text is never typed twice.
import { UNAUTHENTICATED_MESSAGE } from '../auth/guards/jwt-auth.guard';
// import: the safe id pipe. it turns an id from the address into a number, or gives 404.
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
// import: the two input shapes. they are classes, so the validation pipe can check the body against their rules.
import { AddSubjectDto } from './dto/add-subject.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
// import: the 404 messages that the id pipe uses for each route.
import { PROFILE_NOT_FOUND_MESSAGE, SUBJECT_NOT_IN_LIST_MESSAGE } from './users.constants';
// import: the users service does the real work.
import { UsersService } from './users.service';

// @Controller('users') makes every route in this class start with "users".
// the global prefix adds "/api/v1" in front, so the routes are /api/v1/users/...
@Controller('users')
// the users controller. it stays thin on purpose: read the input, call the service, give back the result.
// every rule about profiles and subjects lives in the users service.
// safety: no route here has @Public(), so the global login guard protects every one of them.
// safety: the routes that change data have "me" in the address and no user id, so a person can only ever change their own profile.
export class UsersController {
  // the constructor receives the users service from nestjs.
  constructor(private readonly users: UsersService) {}

  // gives the logged-in person's own profile, with their email and subjects.
  // @Get('me/profile') answers to GET /api/v1/users/me/profile.
  @Get('me/profile')
  // @CurrentUser() gives the person that the login guard found.
  // safety: the id comes from the guard and never from the request address or body.
  async getOwnProfile(@CurrentUser() user: AuthUser) {
    const profile = await this.users.getOwnProfile(user.userId);

    // the account could have been deleted a moment ago. the reply is the same as the guard's "not logged in" reply.
    if (!profile) {
      throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);
    }

    return profile;
  }

  // changes the logged-in person's own name, department, year, or bio.
  // @Patch('me') answers to PATCH /api/v1/users/me. PATCH means "change some fields", not "replace everything".
  @Patch('me')
  // @Body() hands over the whole body as one dto object, after the pipes checked it.
  updateOwnProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateOwnProfile(user.userId, dto);
  }

  // adds one subject to the logged-in person's interests. a POST gives 201 by default, because a link row is created.
  // @Post('me/subjects') answers to POST /api/v1/users/me/subjects.
  @Post('me/subjects')
  addSubject(@CurrentUser() user: AuthUser, @Body() dto: AddSubjectDto) {
    return this.users.addSubject(user.userId, dto.subjectId);
  }

  // removes one subject from the logged-in person's interests. the reply is { "data": null }.
  // @Delete('me/subjects/:subjectId') answers to DELETE /api/v1/users/me/subjects/5.
  // the ":subjectId" part is a route parameter. route parameters are not changed by the snake-to-camel pipe.
  @Delete('me/subjects/:subjectId')
  // @Param() reads one part of the address. the safe id pipe turns it into a number, or gives 404 with the given message.
  // note: the api rule "always take the whole object" is about the body and the query, not about route parameters.
  async removeSubject(
    @CurrentUser() user: AuthUser,
    @Param('subjectId', new ParseIdPipe(SUBJECT_NOT_IN_LIST_MESSAGE)) subjectId: number,
  ): Promise<void> {
    await this.users.removeSubject(user.userId, subjectId);
  }

  // gives another person's public profile: no email, no role, and only active subjects.
  // @Get(':id/profile') answers to GET /api/v1/users/12/profile.
  // this route is written last on purpose, after the "me" routes, so the word "me" is never read as an id.
  @Get(':id/profile')
  getPublicProfile(@Param('id', new ParseIdPipe(PROFILE_NOT_FOUND_MESSAGE)) id: number) {
    return this.users.getPublicProfile(id);
  }
}