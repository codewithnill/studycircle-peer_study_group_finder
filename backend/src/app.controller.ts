import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
// import: the mark that tells the login guard "no login is needed for this route".
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // safety: every route is locked by default. this starter route holds no data, so it is marked public.
  // it can be removed or kept as a simple "is the server alive" check later.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
