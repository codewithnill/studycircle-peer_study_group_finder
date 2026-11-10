// imports from nestjs.
// "CallHandler" is the object an interceptor uses to run the controller.
// "ExecutionContext" describes the current request.
// "StreamableFile" is how nestjs sends a file download.
import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
// "of" makes a stream that holds one value. "lastValueFrom" turns that stream into a promise
// so the test can simply wait for the reply with "await".
import { lastValueFrom, of } from 'rxjs';
// the paging helper, so we can build a list reply the same way a service would.
import { getPaginationParams, paginated } from '../pagination/pagination';
// the class we are testing.
import { ResponseInterceptor } from './response.interceptor';

// a small helper for the tests.
// it pretends a controller returned "value", runs the interceptor, and gives back the final reply.
async function run(value: unknown): Promise<unknown> {
  const interceptor = new ResponseInterceptor();
  // a fake "next": when the interceptor asks to run the controller, it gets our value.
  const next: CallHandler = { handle: () => of(value) };
  // the interceptor does not use the context, so an empty object is enough here.
  return lastValueFrom(interceptor.intercept({} as ExecutionContext, next));
}

describe('ResponseInterceptor', () => {
  // the basic rule: one item goes inside "data", with snake_case keys.
  it('wraps one item in data and uses snake_case keys', async () => {
    const reply = await run({ id: 12, maxSize: 8, examDate: '2026-12-15' });

    expect(reply).toEqual({
      data: { id: 12, max_size: 8, exam_date: '2026-12-15' },
    });
  });

  // actions like logout return nothing. the reply must still be { data: null }.
  it('sends { data: null } when the controller returns nothing', async () => {
    expect(await run(undefined)).toEqual({ data: null });
    expect(await run(null)).toEqual({ data: null });
  });

  // a list reply gets "meta" next to "data".
  it('adds meta for a paginated list', async () => {
    const params = getPaginationParams({ page: 2, limit: 2 });
    const list = paginated([{ groupId: 1 }, { groupId: 2 }], params, 5);

    expect(await run(list)).toEqual({
      data: [{ group_id: 1 }, { group_id: 2 }],
      meta: { page: 2, limit: 2, total: 5, total_pages: 3 },
    });
  });

  // big ids must be sent as text, like "9007".
  it('turns a bigint into a string', async () => {
    const reply = await run({ id: BigInt(9007) });

    expect(reply).toEqual({ data: { id: '9007' } });
  });

  // dates must come out as utc text.
  // note: the text ends with ".000Z" because javascript always writes milliseconds.
  it('turns a date into utc text', async () => {
    const reply = await run({ createdAt: new Date('2026-11-08T10:00:00Z') });

    expect(reply).toEqual({ data: { created_at: '2026-11-08T10:00:00.000Z' } });
  });

  // a file download is not json, so it must pass through untouched.
  it('does not wrap a file download', async () => {
    const file = new StreamableFile(Buffer.from('hello'));

    // "toBe" checks that it is the very same object.
    expect(await run(file)).toBe(file);
  });
});