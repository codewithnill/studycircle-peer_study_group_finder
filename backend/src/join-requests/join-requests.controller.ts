// imports: the decorators for the controller, the routes, the status code, and the request parts.
// "HttpCode" sets the status code of a route. "Query" reads the part of the address after "?".
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
// import: "Throttle" sets a rate limit for one route, in place of the default 100 per minute.
import { Throttle } from '@nestjs/throttler';
// import: the decorator that gives the logged-in person, and its type.
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
// import: the safe id pipe. it turns an id from the address into a number, or gives 404.
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
// import: the shared page query shape (page and limit).
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
// import: the 404 message for a bad group id, reused from the groups module.
import { GROUP_NOT_FOUND_MESSAGE } from '../groups/groups.constants';
// import: the two input shapes. they are classes, so the validation pipe can check the input against their rules.
import { RejectJoinRequestDto } from './dto/reject-join-request.dto';
import { SendJoinRequestDto } from './dto/send-join-request.dto';
// import: the 404 message for a bad request id.
import { JOIN_REQUEST_NOT_FOUND_MESSAGE } from './join-requests.constants';
// import: the service does the real work.
import { JoinRequestsService } from './join-requests.service';

// @Controller() with no name means each route writes its full path below.
// this is needed because the join request routes live under three different words: groups, users, and join-requests (decision 1).
// the global prefix adds "/api/v1" in front of every path.
@Controller()
// the join requests controller. it stays thin on purpose: read the input, call the service, give back the result.
// safety: no route here has @Public(), so the global login guard protects every one of them.
export class JoinRequestsController {
  // the constructor receives the join requests service from nestjs.
  constructor(private readonly joinRequests: JoinRequestsService) {}

  // a student asks to join a group. a POST gives 201 by default, because a new request is created.
  // @Post('groups/:id/join-requests') answers to POST /api/v1/groups/12/join-requests.
  @Post('groups/:id/join-requests')
  // @Throttle() lowers the limit for this route to 10 calls per minute from one address (decision 12).
  // safety: this stops a script from sending requests to every group on the platform.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sendRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(GROUP_NOT_FOUND_MESSAGE)) groupId: number,
    @Body() dto: SendJoinRequestDto,
  ) {
    return this.joinRequests.sendRequest(groupId, user.userId, dto);
  }

  // the leader sees one page of the group's pending requests.
  // @Get('groups/:id/join-requests') answers to GET /api/v1/groups/12/join-requests?page=1.
  @Get('groups/:id/join-requests')
  listGroupRequests(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(GROUP_NOT_FOUND_MESSAGE)) groupId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.joinRequests.listGroupRequests(groupId, user.userId, query);
  }

  // the logged-in student sees one page of their own requests.
  // @Get('users/me/join-requests') answers to GET /api/v1/users/me/join-requests.
  // safety: "me" in the address means the id always comes from the login cookie, never from the address.
  @Get('users/me/join-requests')
  listMyRequests(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.joinRequests.listMyRequests(user.userId, query);
  }

  // the leader accepts a request.
  // @HttpCode(HttpStatus.OK) gives 200, because this is an action on a request that already exists, not a new item.
  @Post('join-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(JOIN_REQUEST_NOT_FOUND_MESSAGE)) requestId: number,
  ) {
    return this.joinRequests.approveRequest(requestId, user.userId);
  }

  // the leader refuses a request with a reason.
  @Post('join-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(JOIN_REQUEST_NOT_FOUND_MESSAGE)) requestId: number,
    @Body() dto: RejectJoinRequestDto,
  ) {
    return this.joinRequests.rejectRequest(requestId, user.userId, dto);
  }

  // the student takes back their own pending request.
  @Post('join-requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe(JOIN_REQUEST_NOT_FOUND_MESSAGE)) requestId: number,
  ) {
    return this.joinRequests.cancelRequest(requestId, user.userId);
  }
}