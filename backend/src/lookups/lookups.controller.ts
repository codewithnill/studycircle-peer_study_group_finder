// imports: "Controller" turns a class into a group of routes, and "Get" marks a method as a GET route.
import { Controller, Get } from '@nestjs/common';
// import: the service that does the database reads, and the two reply types.
import { LevelOption, LookupsService, SubjectOption } from './lookups.service';

// @Controller() with no name means the routes below sit right after the /api/v1 prefix,
// so the addresses are /api/v1/subjects and /api/v1/levels.
@Controller()
// the routes for the two fixed lists of choices. the controller stays thin: it only calls the service.
// safety: there is no @Public() here, so the global login guard locks both routes. only logged-in people can read them.
export class LookupsController {
  // the constructor receives the lookups service from nestjs.
  constructor(private readonly lookups: LookupsService) {}

  // GET /api/v1/subjects gives the active subjects for a dropdown.
  // @Get('subjects') connects this method to that address.
  @Get('subjects')
  listSubjects(): Promise<SubjectOption[]> {
    return this.lookups.listActiveSubjects();
  }

  // GET /api/v1/levels gives the active levels for a dropdown.
  // @Get('levels') connects this method to that address.
  @Get('levels')
  listLevels(): Promise<LevelOption[]> {
    return this.lookups.listActiveLevels();
  }
}