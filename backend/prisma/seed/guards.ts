// this file only holds safety checks. they run before the seed script touches the database.
// nothing in here talks to the database, so the checks cannot change any data by mistake.
// no imports are needed. process, URL, and Error are built into node.js.

// host names that mean "this computer". the seed wipes every table, so it is only
// allowed to run against a database on the same machine as the script.
const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '[::1]'];

// the fake value from .env.example. a real admin password must replace it in backend/.env.
const PLACEHOLDER_PASSWORD = 'change_me_demo_only';

// the shortest admin password the seed accepts.
const MIN_PASSWORD_LENGTH = 8;

// stops the script when the environment looks unsafe.
// it throws an error on the first problem found. the entry file catches it and exits.
export function assertSafeToSeed(): void {
  // step 1: read the environment name. an empty value becomes '' so the check never crashes.
  // trim and lowercase catch values like " Production " as well.
  const nodeEnv = (process.env['NODE_ENV'] ?? '').trim().toLowerCase();

  // the seed wipes all data, so it must never run in production.
  if (nodeEnv === 'production') {
    throw new Error('seed refused: NODE_ENV is "production". the seed only runs in development.');
  }

  // step 2: read the database link from the environment.
  const databaseUrl = process.env['DATABASE_URL'];

  // a missing link means .env was not loaded or the name is misspelled.
  if (!databaseUrl) {
    throw new Error('seed refused: DATABASE_URL is missing. check backend/.env.');
  }

  // step 3: find the host name inside the link.
  let hostName: string;
  try {
    // the URL class splits a link into its parts. hostname is the part after the @ sign.
    hostName = new URL(databaseUrl).hostname;
  } catch {
    // safety: a new error is thrown on purpose. the original parse error can carry the
    // full link, and the link contains the database password. never print it.
    throw new Error('seed refused: DATABASE_URL is not a valid link. check backend/.env.');
  }

  // the host must be this computer. this stops a wipe of a remote or shared database
  // when a wrong .env is loaded by mistake.
  if (!LOCAL_HOSTS.includes(hostName.toLowerCase())) {
    // safety: the message does not show the host or the link, only that the check failed.
    throw new Error('seed refused: the database is not on this computer. the seed only wipes a local database.');
  }
}

// reads the admin password from the environment and checks that it is strong enough.
// returns the password so the user seeding code can hash it. the password is never stored here.
export function getAdminPassword(): string {
  // read the value that was set in backend/.env.
  const password = process.env['SEED_ADMIN_PASSWORD'];

  // a missing value means the variable was never added to backend/.env.
  if (!password) {
    throw new Error('seed refused: SEED_ADMIN_PASSWORD is missing. add it to backend/.env.');
  }

  // the placeholder from .env.example is public, so anyone could guess it.
  if (password === PLACEHOLDER_PASSWORD) {
    throw new Error('seed refused: SEED_ADMIN_PASSWORD still has the placeholder value. choose your own password in backend/.env.');
  }

  // a very short password is easy to guess.
  if (password.length < MIN_PASSWORD_LENGTH) {
    // safety: the message gives the rule only. never print the password itself.
    throw new Error(`seed refused: SEED_ADMIN_PASSWORD must have at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  // all checks passed, so the password can be used.
  return password;
}