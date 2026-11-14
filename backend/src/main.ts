// nestfactory is the tool that builds and starts a nestjs application.
import { NestFactory } from '@nestjs/core';

// configservice reads values from the .env file, for example the frontend address.
import { ConfigService } from '@nestjs/config';
// cookieparser is a small tool that reads the cookie header of each request and fills req.cookies.
// without it, the server cannot see the login cookies that the browser sends.
// the default import style works because "esModuleInterop" is on in tsconfig.json.
import cookieParser from 'cookie-parser';

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





  
  // get the config service from the app, so the code can read values from the .env file.
  const config = app.get(ConfigService);
  // read the address of the frontend (for example http://localhost:3001).
  const frontendUrl = config.get<string>('FRONTEND_URL');

  // safety: stop the server at once when the frontend address is missing.
  // a missing value must never turn into "allow every website", so there is no fallback.
  if (!frontendUrl) {
    throw new Error(
      'FRONTEND_URL is missing. add it to backend/.env (see backend/.env.example).',
    );
  }

  // start reading cookies on every request.
  // this runs before any route, so the guards can read the login cookies later.
  app.use(cookieParser());

  // cors is the browser's permission check.
  // the frontend (port 3001) and the api (port 3000) are different origins, so the browser blocks the call
  // unless the api says "this origin is allowed".
  app.enableCors({
    // allow only the frontend address, never "*".
    // a trailing slash is removed, because the browser sends the origin without one and the match must be exact.
    origin: frontendUrl.replace(/\/+$/, ''),
    // without this line the browser drops the login cookies, both when sending and when receiving.
    // safety: this is only safe because the origin above is one exact address and not "*".
    credentials: true,
    // allow only the http methods that the api really uses.
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    // allow only the request headers that the frontend needs.
    allowedHeaders: ['Content-Type', 'Accept'],
  });





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

  

  // start listening for requests. use the port from the environment if it exists, otherwise 3000.
  await app.listen(process.env.PORT ?? 3000);
}

// run the function. "void" means the code does not wait for its result here.
void bootstrap();