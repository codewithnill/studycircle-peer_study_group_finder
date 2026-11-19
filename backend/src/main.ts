// nestfactory is the tool that builds and starts a nestjs application.
import { NestFactory } from '@nestjs/core';

// appmodule is the root module. it is the starting point that connects every other module.
import { AppModule } from './app.module';
// configureapp holds the shared setup: cookies, cors, the /api/v1 prefix, the pipes, the reply wrapper and the error filter.
// the e2e tests call the same function, so the tests check the same setup as the real server.
import { configureApp } from './app.setup';

// this function starts the whole backend server.
// it is "async" because creating the app and opening the port take time, and the code waits for them.
async function bootstrap() {
  // build the app from the root module. "await" means: wait here until it is ready.
  const app = await NestFactory.create(AppModule);

  // apply the shared setup. it also stops the server at once if FRONTEND_URL is missing.
  // it must run before app.listen(), because nestjs reads these settings while it starts up.
  configureApp(app);

  // tell nestjs to listen for the "stop" signal (for example, when ctrl+c is pressed).
  // without this line, onModuleDestroy() in prismaservice never runs,
  // so the database connection is cut off instead of closed cleanly.
  // this stays here and not in configureapp, because only a real running server gets a stop signal.
  app.enableShutdownHooks();

  // start listening for requests. use the port from the environment if it exists, otherwise 3000.
  await app.listen(process.env.PORT ?? 3000);
}

// run the function. "void" means the code does not wait for its result here.
void bootstrap();