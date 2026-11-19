// imports the type of a built nestjs app, so the variable below has a clear type.
import type { INestApplication } from '@nestjs/common';
// imports supertest. it sends http requests to the app in memory and checks the replies.
import request from 'supertest';
// imports the server type that supertest expects.
import type { App } from 'supertest/types';
// imports the helper that builds the test app with the same setup as the real server.
import { createTestApp } from './support/create-test-app';

// these tests prove that the e2e app has the real setup from configureapp (tracker item 51).
// they check the /api/v1 prefix, the "data" wrapper and the three-key error shape.
// describe, it, expect, beforeAll and afterAll are jest tools. they are available without an import.
describe('app setup (e2e)', () => {
  // holds the test app for all tests in this file.
  let app: INestApplication<App>;

  // runs once before the tests. one app is enough here, because these tests change no data.
  beforeAll(async () => {
    app = await createTestApp();
  });

  // runs once after the tests. closes the app and its database connection, so jest can exit cleanly.
  afterAll(async () => {
    await app.close();
  });

  // proves the prefix and the reply wrapper. this is the same check as the browser check on the real server.
  it('GET /api/v1 gives the wrapped hello reply', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1').expect(200);

    // the reply must be wrapped in "data" (section 2 of the api shape rules).
    expect(res.body).toEqual({ data: 'Hello World!' });
  });

  // proves the error filter. an unknown address must give the three-key error shape, not the default nestjs shape.
  it('an unknown route gives the three-key error shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nothing-here').expect(404);

    // the reply must have exactly these three keys (section 3 of the api shape rules).
    expect(Object.keys(res.body).sort()).toEqual(['errors', 'message', 'status_code']);
    expect(res.body.status_code).toBe(404);
    expect(res.body.errors).toEqual([]);
  });
});