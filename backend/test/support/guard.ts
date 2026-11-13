// the only hosts that count as "this computer".
// a test run may wipe data, so it must never reach a remote or shared database.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// the ending that every test database name must have, for example "studycircle_test".
// a loose "contains test" rule is weaker, because a name like "latest_studycircle" would pass it.
const TEST_DATABASE_SUFFIX = '_test';

// reads the database name out of a connection link.
// example: ".../studycircle_test?schema=public" gives "studycircle_test".
// the link is parsed with the built-in URL tool, so no hand-made text cutting is needed.
export function getDatabaseName(databaseUrl: string): string {
  // holds the parsed link. it stays outside the try block so the later lines can use it.
  let parsed: URL;
  try {
    // turns the link text into an object with named parts (host, path, and so on).
    parsed = new URL(databaseUrl);
  } catch {
    // safety: a new error is thrown on purpose, so the original error (which may hold the link and its password) is dropped.
    throw new Error('test setup stopped: the database link is not a valid link.');
  }
  // the path starts with a slash, for example "/studycircle_test". the slash is removed.
  // decodeURIComponent turns encoded characters (like %5F) back into normal letters.
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
}

// stops the test run if the link does not clearly point to a local test database.
// the rules are the same idea as the seed script guard: refuse first, ask questions later.
// safety: error messages in this file never print the whole link, because it contains the password.
export function assertSafeTestDatabaseUrl(databaseUrl: string | undefined): void {
  // refuses a missing or empty link, so nothing falls back to a default.
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('test setup stopped: no database link was given.');
  }

  // refuses to run when the process is marked as production.
  // tests wipe tables, so they have no place anywhere near production.
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('test setup stopped: NODE_ENV is "production".');
  }

  // parses the link a second time here to read its host and protocol.
  // the same safe error as above is used when the link is broken.
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('test setup stopped: the database link is not a valid link.');
  }

  // allows only postgres links. any other kind of link is a sign of a wrong setting.
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('test setup stopped: the database link is not a postgres link.');
  }

  // allows only a database on this computer.
  if (!LOCAL_HOSTS.includes(parsed.hostname)) {
    throw new Error('test setup stopped: the test database must be on this computer (localhost).');
  }

  // allows only a database whose name ends with "_test".
  // this is the main rule. the name is printed because it is not a secret, and it helps to find the mistake fast.
  const databaseName = getDatabaseName(databaseUrl);
  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `test setup stopped: the database name "${databaseName}" does not end with "${TEST_DATABASE_SUFFIX}".`,
    );
  }
}