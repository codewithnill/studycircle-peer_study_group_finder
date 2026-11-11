// nestfactory is the tool that builds and starts a nestjs application.
import { NestFactory } from '@nestjs/core';
// appmodule is the root module. it is the starting point that connects every other module.
import { AppModule } from './app.module';
// the four shared pieces from src/common. together they enforce the api shape rules.
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { SnakeToCamelPipe } from './common/pipes/snake-to-camel.pipe';
import { createValidationPipe } from './common/pipes/validation-pipe.factory';

// this function starts the whole backend server.
// it is "async" because creating the app and opening the port take time, and the code waits for them.
async function bootstrap() {
  // build the app from the root module. "await" means: wait here until it is ready.
  const app = await NestFactory.create(AppModule);

  // every route starts with /api/v1 (section 1 of the api shape rules).
  // this is the only place where the prefix is set. controllers never repeat it.
  app.setGlobalPrefix('api/v1');

  // pipes run on incoming data, in the order listed here.
  // first: change incoming keys from snake_case to camelCase.
  // second: check the data against the dto rules.
  // the order matters, because the dto rules expect camelCase names.
  app.useGlobalPipes(new SnakeToCamelPipe(), createValidationPipe());

  // wrap every success reply in "data" (and add "meta" for lists).
  app.useGlobalInterceptors(new ResponseInterceptor());

  // turn every error into the three-key error reply.
  app.useGlobalFilters(new AllExceptionsFilter());

  // tell nestjs to listen for the "stop" signal (for example, when ctrl+c is pressed).
  // without this line, onModuleDestroy() in prismaservice never runs,
  // so the database connection is cut off instead of closed cleanly.
  app.enableShutdownHooks();

  // note: cors and the cookie reader are added in week 2, together with login.

  // start listening for requests. use the port from the environment if it exists, otherwise 3000.
  await app.listen(process.env.PORT ?? 3000);
}

// run the function. "void" means the code does not wait for its result here.
void bootstrap();