// axios is the library that sends http requests from the browser to the api and reads the replies.
// the default import gives the main axios object, which can build a ready-made client with fixed settings.
import axios from 'axios';

// read the api address from the env files (.env.local on a laptop).
// next.js copies a NEXT_PUBLIC_ value into the browser code when the app is built or started,
// so the name must be written out in full like this. a dynamic lookup would find nothing in the browser.
// safety: this value is public. it is only an address, never a secret.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;

// safety: stop at once when the address is missing.
// a silent fallback could send login requests to the wrong server, so there is none.
// the backend follows the same rule for FRONTEND_URL.
if (!rawApiUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is missing. add it to frontend/.env.local (see frontend/.env.example), then restart npm run dev.',
  );
}

// remove any slash at the end, so "/api/v1/" and "/api/v1" both work the same way.
// request paths below always start with a slash, for example "/auth/me".
const apiUrl = rawApiUrl.replace(/\/+$/, '');

// the one shared api client for the whole frontend.
// every page and hook imports this object, so the address and the cookie setting live in one place only.
export const api = axios.create({
  // every request path is added to this address.
  // for example, api.get('/auth/me') calls http://localhost:3000/api/v1/auth/me.
  baseURL: apiUrl,

  // the login cookies are httponly, so page code can never read or send them by hand.
  // this setting tells the browser to attach them to every request to the api, and to save new ones from the replies.
  // without it, the browser drops the cookies, because the api runs on a different port (another "origin").
  // safety: this works only because the api allows exactly one origin (FRONTEND_URL) with credentials, never "*".
  withCredentials: true,

  // ask the api for json replies. "accept" is one of the two headers that the api's cors setup allows.
  headers: {
    Accept: 'application/json',
  },

  // give up after 10 seconds, so a page never waits forever when the api is not running.
  timeout: 10_000,
});