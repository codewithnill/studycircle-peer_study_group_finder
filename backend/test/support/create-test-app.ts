// imports the nestjs testing tool. it builds a module in memory, the same way the real app does, but without opening a port.
import { Test } from '@nestjs/testing';
// imports the type of a built nestjs app. "import type" is used because only the type is needed.
import type { INestApplication } from '@nestjs/common';
// imports the server type that supertest expects, so the app type below matches what supertest's request() takes.
import type { App } from 'supertest/types';
// imports the root module. the test app is built from it, so every real module, guard and route is included.
import { AppModule } from '../../src/app.module';
// imports the shared setup that main.ts also uses (tracker item 51).
import { configureApp } from '../../src/app.setup';

// builds a test app that matches the real server: same modules, same guards, and the same setup from configureapp.
// the only thing it skips is listen(), because supertest sends requests straight to the app without a real port.
// safety: test-env.ts has already pointed DATABASE_URL to the test database, so this app talks to studycircle_test only.
export async function createTestApp(): Promise<INestApplication<App>> {
  // builds the module tree from the root module, just like NestFactory.create() does in main.ts.
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // turns the module tree into an app object that can receive requests.
  const app = moduleFixture.createNestApplication<INestApplication<App>>();

  // applies the shared setup: cookies, cors, the /api/v1 prefix, the pipes, the reply wrapper and the error filter.
  // it must run before init(), because nestjs reads these settings while it starts up.
  configureApp(app);

  // starts the app without opening a port. this also opens the database connection in prismaservice.
  await app.init();

  return app;
}