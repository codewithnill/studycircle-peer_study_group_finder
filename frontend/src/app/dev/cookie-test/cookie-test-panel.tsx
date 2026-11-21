// "use client" marks this file as a client component. it runs in the browser,
// which is needed because it uses state, handles clicks, and reads document.cookie.
'use client';

// usestate stores values that change on the screen (the typed email, the results).
// useref stores a counter that survives re-renders without causing one.
// formevent is the type of the form submit event. "type" means it is used only for type checks.
import { useRef, useState, type FormEvent } from 'react';
// isaxioserror tells an axios error apart from any other error.
// axiosresponse is the type of a successful axios reply.
import { isAxiosError, type AxiosResponse } from 'axios';
// the one shared api client with the api address and withCredentials turned on (src/lib/api.ts).
import { api } from '@/lib/api';

// one line in the results list: which request ran, the status code, and the reply body.
type ResultLine = {
  id: number;
  label: string;
  status: string;
  body: string;
};

// turns any error into a status and a readable body for the results list.
function describeError(error: unknown): { status: string; body: string } {
  // an axios error with a reply means the api answered with an error code, like 401.
  if (isAxiosError(error) && error.response) {
    return {
      status: String(error.response.status),
      // the api's three-key error shape (status_code, message, errors).
      body: JSON.stringify(error.response.data, null, 2),
    };
  }

  // an axios error with no reply means the request never got an answer.
  // the usual causes: the backend is not running, or the browser blocked the reply because of cors.
  if (isAxiosError(error)) {
    return {
      status: 'no reply',
      body: `${error.message}. check that the backend runs on port 3000, and look for a cors error in the console.`,
    };
  }

  // anything else is a bug in this page.
  return { status: 'error', body: 'unexpected error in the test page.' };
}

// the cookie test panel: a login form, four test buttons, and a list of results.
// it uses plain html with a few inline layout styles only (no tailwind), as the ui workflow rule asks.
export function CookieTestPanel() {
  // the email typed into the form.
  const [email, setEmail] = useState('');
  // the password typed into the form.
  // safety: the password is never written in the code. it is typed by hand and cleared after each login.
  const [password, setPassword] = useState('');
  // true while a request is running, so the buttons cannot be pressed twice.
  const [busy, setBusy] = useState(false);
  // every result so far, newest first.
  const [results, setResults] = useState<ResultLine[]>([]);
  // a simple counter that gives each result line its own id (react needs a stable key for list items).
  const nextId = useRef(1);

  // adds one line to the top of the results list.
  function addResult(line: Omit<ResultLine, 'id'>) {
    // take the current counter value, then move the counter on by one.
    const id = nextId.current;
    nextId.current += 1;
    // build a new list with the new line first. react needs a new list, not a changed old one.
    setResults((previous) => [{ id, ...line }, ...previous]);
  }

  // runs one api request and records what came back.
  // every request starts from a button click, never from useEffect.
  // this avoids the react strictmode trap: in development, strictmode runs effects twice,
  // which would send two logins or two refreshes, and a second refresh with a used token would fail.
  async function runRequest(label: string, send: () => Promise<AxiosResponse>) {
    // lock the buttons while the request runs.
    setBusy(true);
    try {
      // send the request and wait for the reply.
      const response = await send();
      // record the status and the body.
      // safety: the api never puts tokens in the json body, so the body is safe to show.
      // the only private value in a reply is the person's own email, which is allowed.
      addResult({
        label,
        status: String(response.status),
        body: JSON.stringify(response.data, null, 2),
      });
    } catch (error) {
      // record the error in the same list. nothing is printed to the console.
      addResult({ label, ...describeError(error) });
    } finally {
      // unlock the buttons, whether the request worked or not.
      setBusy(false);
    }
  }

  // sends the login form to the api.
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    // stop the browser from reloading the page, which is what a form does by default.
    event.preventDefault();
    // keep the typed password in a local value, then clear it from the form at once.
    const typedPassword = password;
    setPassword('');
    // the body keys are snake_case words already (email, password), as the api shape rules ask.
    // when the reply arrives, the browser saves the two httponly cookies by itself.
    await runRequest('POST /auth/login', () =>
      api.post('/auth/login', { email, password: typedPassword }),
    );
  }

  // shows what page javascript can see in document.cookie.
  // the two login cookies are httponly, so they must not appear here.
  // note: cookies are not separated by port on localhost. a cookie set by another app on any
  // localhost port (for example an old project) can show up here or clash with the same name.
  function showDocumentCookie() {
    addResult({
      label: 'document.cookie',
      status: '-',
      body: document.cookie === '' ? '(empty)' : document.cookie,
    });
  }

  // the screen: a heading, the login form, the test buttons, and the results.
  return (
    <main
      style={{
        maxWidth: '40rem',
        margin: '0 auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <header>
        <h1>Cookie test (development only)</h1>
        <p>This page checks that the login cookies travel between port 3001 and the API on port 3000.</p>
      </header>

      <section aria-labelledby="login-heading">
        <h2 id="login-heading">1. Log in</h2>
        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button type="submit" disabled={busy}>
            Log in
          </button>
        </form>
      </section>

      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading">2. Check the session</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* who is logged in now? the access cookie (path /) goes with this request. */}
          <button type="button" disabled={busy} onClick={() => runRequest('GET /auth/me', () => api.get('/auth/me'))}>
            Who am I (GET /auth/me)
          </button>

          {/* get two new cookies. the refresh cookie has path /api/v1/auth,
              so the browser sends it only to addresses under /api/v1/auth, like this one. */}
          <button type="button" disabled={busy} onClick={() => runRequest('POST /auth/refresh', () => api.post('/auth/refresh'))}>
            Refresh (POST /auth/refresh)
          </button>

          {/* end the session. the api clears both cookies and cancels the refresh token. */}
          <button type="button" disabled={busy} onClick={() => runRequest('POST /auth/logout', () => api.post('/auth/logout'))}>
            Log out (POST /auth/logout)
          </button>

          {/* prove that page javascript cannot see the httponly cookies. */}
          <button type="button" onClick={showDocumentCookie}>
            Show document.cookie
          </button>

          {/* empty the results list. this changes nothing on the server. */}
          <button type="button" onClick={() => setResults([])}>
            Clear results
          </button>
        </div>
      </section>

      {/* aria-live tells screen readers to read out new results as they appear. */}
      <section aria-labelledby="results-heading" aria-live="polite">
        <h2 id="results-heading">Results (newest first)</h2>
        {results.length === 0 ? (
          <p>No requests yet.</p>
        ) : (
          <ol style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem' }}>
            {results.map((line) => (
              <li key={line.id}>
                <strong>{line.label}</strong> → status {line.status}
                <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{line.body}</pre>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}