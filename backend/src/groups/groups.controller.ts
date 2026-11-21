// imports: the decorators for the controller, the routes, and the request parts.
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
// import: "Throttle" sets a rate limit for one route, in place of the default 100 per minute.
import { Throttle } from '@nestjs/throttler';
// import: the decorator that gives the logged-in person, and its type.
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
// import: the safe id pipe. it turns an id from the address into a number, or gives 404.
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
// import: the two input shapes. they are classes, so the validation pipe can check the body against their rules.
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
// import: the 404 message the id pipe uses for a bad group id.
import { GROUP_NOT_FOUND_MESSAGE } from './groups.constants';
// import: the groups service does the real work.
import { GroupsService } from './groups.service';

// @Controller('groups') makes every route in this class start with "groups".
// the global prefix adds "/api/v1" in front, so the routes are /api/v1/groups/...
@Controller('groups')
// the groups controller. it stays thin on purpose: read the input, call the service, give back the result.
// every rule about groups lives in the groups service.
// safety: no route here has @Public(), so the global login guard protects every one of them.
export class GroupsController {
  // the constructor receives the groups service from nestjs.
  constructor(private readonly groups: GroupsService) {}

  // creates a new group with the logged-in person as its leader. a POST gives 201 by default.
  // @Post() with no name answers to POST /api/v1/groups.
  @Post()
  // @Throttle() lowers the limit for this route to 10 calls per minute from one address.
  // safety: this stops one person from flooding the search with fake groups. "ttl" is the time window in milliseconds.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  // @CurrentUser() gives the person that the login guard found. @Body() hands over the whole checked body as one dto.
  // safety: the leader id comes from the guard and never from the body.
  createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.createGroup(user.userId, dto);
  }

  // gives one group page, with seats left and the viewer's own role.
  // @Get(':id') answers to GET /api/v1/groups/12. ":id" is a route parameter.
  @Get(':id')
  // @Param() reads one part of the address. the safe id pipe turns it into a number, or gives 404 with the group message.
  getGroup(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(GROUP_NOT_FOUND_MESSAGE)) id: number,
  ) {
    return this.groups.getGroup(id, user.userId);
  }

  // changes a group's details. only the leader may do this. the service checks it against the database.
  // @Patch(':id') answers to PATCH /api/v1/groups/12. PATCH means "change some fields", not "replace everything".
  @Patch(':id')
  updateGroup(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(GROUP_NOT_FOUND_MESSAGE)) id: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.updateGroup(id, user.userId, dto);
  }
}