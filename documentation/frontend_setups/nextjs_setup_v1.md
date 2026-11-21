# StudyCircle — Next.js Frontend Setup (v1)

**Written:** 21 November 2026 (v1)
**Scope:** How the Next.js frontend in `frontend/` was created, set up, and checked. This file grows the same way as the backend setup file: when the setup changes, make a new version (v2, v3) and add a row to the change log.
**Tracker item:** 24 (Next.js project and the cookie test between ports 3001 and 3000).
**Status (21 November 2026):** The project runs on `http://localhost:3001`. Lint and the production build pass. The cross-port cookie test passed all five checks in DevTools. The backend did not change: 163 unit tests and 44 e2e tests still pass.
**Related files:** `nestjs_setup_v11.md` (backend setup, CORS, cookies), `studycircle_api_shape_v6.md` (reply shapes), `studycircle_mvp_3_month_plan.md` (roadmap), `studycircle_fixed_values.md` (fixed words).

> **What this file is:** the record of every command, choice, and check for the frontend, so any teammate can repeat the setup or find out why something is the way it is.
> **Golden rule:** keep frontend and backend fully separate. The frontend talks to the API only over HTTP, through one Axios file.

---

## Part 1. Versions

| Tool | Version | Note |
|---|---|---|
| `create-next-app` | `16.4.6` | Pinned in the command, so the scaffold matches this file. |
| `next` | `16.4.6` | Next.js 16, with Turbopack on by default. |
| `react`, `react-dom` | `19.3.0` | React 19. |
| `tailwindcss`, `@tailwindcss/turbopack` | `4.3.3` | Tailwind CSS 4. The scaffold uses the Turbopack plugin, not a PostCSS file. |
| `typescript` | `^5` | Separate from the backend, which uses TypeScript 6. |
| `eslint` | `^9` (installed `9.39.5`) | npm warns that this version is no longer supported. Next.js chose it. See Part 9. |
| `eslint-config-next` | `16.4.6` | The Next.js lint rules. |
| `axios` | `1.21.1` (exact, no `^`) | The HTTP client. See Step 8. |
| npm | `12.0.2` | npm 12 blocks install scripts unless they are approved. No frontend package needed one. |

---

## Part 2. Decisions

### Decision 6 — the `create-next-app` answers

The current options were checked in the official docs: https://nextjs.org/docs/app/api-reference/cli/create-next-app

| Question | Answer | Flag | Why |
|---|---|---|---|
| TypeScript | Yes | `--ts` | Decided in the project plan. |
| Linter | ESLint | `--eslint` | The standard choice, with Next.js rules built in. |
| React Compiler | No | `--no-react-compiler` | It adds an extra Babel package and slower builds. Easy to add later. |
| Tailwind CSS | Yes | `--tailwind` | Decided in the project plan. |
| `src/` folder | Yes | `--src-dir` | The project keeps code in `frontend/src/` (for example `src/lib`). |
| App Router | Yes | `--app` | Decided in the project plan. |
| Cache Components | No | `--no-cache-components` | New and on by default. It changes how pages cache data and gives confusing build errors while learning. One line in `next.config.ts` turns it on later. |
| Import alias | `@/*` | `--import-alias "@/*"` | Lets code write `@/lib/api` instead of `../../lib/api`. |
| AGENTS.md | Yes | `--agents-md` | A small file that points AI helpers to the docs for this exact Next.js version. The backend has one too. |
| Agent feedback | No | `--no-agent-feedback` | Sends anonymous data to Next.js. Not needed. |
| Package manager | npm | `--use-npm` | Same as the backend. |
| Git | Off | `--disable-git` | **A nested `.git` inside `frontend/` must never exist.** This flag makes sure of it. |

Turbopack is no longer a question in `create-next-app` 16. It is on by default. `--webpack` would turn it off.

### Decision 7 — the cookie test page

The test page is **kept as a dev-only page** (option c). It lives at `src/app/dev/cookie-test/` and answers with `404` in a production build. Any teammate can run the cookie test again in one minute, for example when the deploy setup changes. **It must be deleted before going live (tracker item 52).**

### Decision 8 — where the frontend notes live

A separate, versioned file: `documentation/frontend_setups/nextjs_setup_v1.md` (this file). It mirrors `documentation/backend_setups/`. Each side has its own file, so a team of four gets fewer merge conflicts. Shared facts (ports, CORS, cookie names) point to the backend file instead of being copied.

---

## Part 3. Setup Steps

All commands run in PowerShell. Each step says the folder.

### Step 1 — Prove Git ignores the files before they exist

Run from the repository root:

```powershell
git check-ignore -v frontend/.env.local
```

Expected: `.gitignore:10:.env.*	frontend/.env.local`.

```powershell
git check-ignore -v frontend/node_modules/ frontend/.next/
```

Expected: two lines, one for `node_modules/` and one for `.next/`.

**Note:** the slash at the end of the paths matters. The rules `node_modules/` and `.next/` match folders only. A folder that does not exist yet cannot be recognised as a folder, so without the slash the command prints nothing. That is not a failure.

### Step 2 — Check the version that would be installed

Run from the repository root (reads only, installs nothing):

```powershell
npm view create-next-app version
```

Result on 21 November 2026: `16.4.6`.

### Step 3 — Create the project

Run from the repository root (not inside `frontend/`). The empty `frontend/` folder is used as the target.

```powershell
npx create-next-app@16.4.6 frontend --ts --eslint --no-react-compiler --tailwind --src-dir --app --no-cache-components --import-alias "@/*" --agents-md --no-agent-feedback --use-npm --disable-git
```

Type `y` when npx asks `Ok to proceed?`. No other question appears, because the flags answer them all.

Expected end of the output: `found 0 vulnerabilities`, `Skipping git initialization.`, and `Success! Created frontend at ...`. No install script was blocked.

### Step 4 — Prove there is no nested `.git`

Run from the repository root:

```powershell
Test-Path frontend\.git
```

Expected: `False`.

### Step 5 — Move the app to port 3001

The API uses port 3000. In `frontend/package.json`, two scripts were changed:

| Script | Before | After |
|---|---|---|
| `dev` | `next dev` | `next dev --port 3001` |
| `start` | `next start` | `next start --port 3001` |

`http://localhost:3001` is also the value of `FRONTEND_URL` in `backend/.env`, so CORS allows exactly this address.

### Step 6 — Run, lint, and build

Run from `frontend/`:

```powershell
npm run dev
```

Expected: `Local: http://localhost:3001`, and the Next.js welcome page in the browser. Press `Ctrl + C` to stop.

```powershell
npm run lint
```

Expected: no output (no problems). In Next.js 16 the `lint` script runs `eslint` directly. The old `next lint` command is gone.

```powershell
npm run build
```

Expected: `Compiled successfully`, TypeScript finished, and a route list with `/` and `/_not-found`.

### Step 7 — Check the untracked list and commit the scaffold

Run from the repository root:

```powershell
git status --short --untracked-files=all frontend
```

Expected: 17 scaffold files (`.gitignore`, `AGENTS.md`, `README.md`, `eslint.config.mjs`, `next.config.ts`, `package-lock.json`, `package.json`, five SVG files in `public/`, `favicon.ico`, `globals.css`, `layout.tsx`, `page.tsx`, `tsconfig.json`). Never `.env.local`, `node_modules`, `.next`, or `.git`. `next-env.d.ts` is not listed because `frontend/.gitignore` ignores it.

### Step 8 — Install Axios with an exact version

**Why Axios:** the frontend needs one way to send requests to the API. Axios is set up once with the API address and `withCredentials: true`, so the browser sends the HttpOnly login cookies with every request. The browser's own `fetch` could do the same, but the project plan chose Axios.

**Safety note:** in March 2026 an attacker took over an Axios maintainer's npm account and published two bad versions, `1.14.1` and `0.30.4`. npm removed them within hours. So the version is checked first and pinned exactly.

Run from the repository root:

```powershell
npm view axios version
```

Result on 21 November 2026: `1.21.1` (not one of the bad versions).

Run from `frontend/`:

```powershell
npm install axios@1.21.1 --save-exact
```

Expected: `found 0 vulnerabilities`, no blocked install scripts. `--save-exact` writes `"1.21.1"` without `^`, so npm never moves to a newer version on its own.

Check the diff before the commit (from `frontend/`):

```powershell
git --no-pager diff package.json
```

Expected: one added line, `"axios": "1.21.1"`, in `dependencies`.

### Step 9 — The environment files

| File | Committed? | Content |
|---|---|---|
| `frontend/.env.example` | Yes | `NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"`, with comments |
| `frontend/.env.local` | **Never** | The same value on a laptop (made with `Copy-Item .env.example .env.local` from `frontend/`) |

**Safety:** every variable whose name starts with `NEXT_PUBLIC_` is copied into the browser code, so anyone who opens the site can read it. Only public values (like the API address) go there. Never a password, a secret, or a token.

**The `.gitignore` trap that was found:** the scaffold's `frontend/.gitignore` has the rule `.env*`. It also hid `.env.example`, and a `.gitignore` inside a folder wins over the root one. The fix was one line right after `.env*`:

```text
!.env.example
```

Check from `frontend/`:

```powershell
git check-ignore -v .env.example .env.local
```

Expected:

```text
frontend/.gitignore:38:!.env.example	.env.example
frontend/.gitignore:35:.env*	.env.local
```

The `!` line means `.env.example` is allowed. `.env.local` stays ignored.

**Note:** Next.js reads env files when `npm run dev` or `npm run build` starts. After a change to `.env.local`, restart the app. The build output shows `Environments: .env.local` when the file was found.

### Step 10 — The Axios file

File: `frontend/src/lib/api.ts`. It exports one client, `api`, that every page and hook imports.

| Setting | Value | Why |
|---|---|---|
| `baseURL` | `NEXT_PUBLIC_API_URL`, with any end slash removed | `api.get('/auth/me')` calls `http://localhost:3000/api/v1/auth/me`. |
| `withCredentials` | `true` | The browser sends and saves the HttpOnly cookies across ports. |
| `headers.Accept` | `application/json` | One of the two headers the API's CORS setup allows. |
| `timeout` | `10_000` (10 seconds) | A page never waits forever when the API is down. |

The file **throws an error at once** when `NEXT_PUBLIC_API_URL` is missing. There is no fallback address, the same rule the backend follows for `FRONTEND_URL`.

The variable is written out in full (`process.env.NEXT_PUBLIC_API_URL`). Next.js replaces that exact text when it builds the browser code. A dynamic lookup would find nothing in the browser.

**Not in v1:** an automatic refresh after a `401`. It belongs with the real login page. In the cookie test, refresh is a button.

### Step 11 — The dev-only cookie test page

| File | Job |
|---|---|
| `src/app/dev/cookie-test/page.tsx` | A server component. It calls `notFound()` when `NODE_ENV` is `production`, otherwise it shows the panel. It also tells search engines not to list the page. |
| `src/app/dev/cookie-test/cookie-test-panel.tsx` | A client component (`'use client'`). A login form, five buttons (Who am I, Refresh, Log out, Show document.cookie, Clear results), and a results list, newest first. |

Rules followed in the page:

1. Plain HTML only, no Tailwind classes (UI workflow rule). Only small inline styles for layout and borders.
2. The password is typed into an input field. It is never written in the code, and the field is cleared after each login.
3. Every request runs on a button click, never in `useEffect` (see the StrictMode trap in Part 5).
4. Nothing is printed to the browser console. Replies are shown on the page. The API never puts tokens in JSON, so the replies are safe to show.

Address: `http://localhost:3001/dev/cookie-test`.

**Production guard check.** From `frontend/`, run `npm run build`, then:

```powershell
npm run start
```

Open `http://localhost:3001/dev/cookie-test`. Expected: the `404` "This page could not be found" page. Press `Ctrl + C` to stop.

**Tailwind border fix.** The scaffold's `globals.css` loads Tailwind, and its reset (Preflight) removes the browser's default borders from inputs and buttons. On the dark background they were invisible. Two inline style objects (`fieldStyle` and `buttonStyle`) give them a one-pixel border again. These are not Tailwind classes.

---

## Part 4. The Cookie Test (21 November 2026)

### How to run it

1. Terminal 1, from `backend/`: `npm run start:dev` (API on port 3000).
2. Terminal 2, from `frontend/`: `npm run dev` (frontend on port 3001).
3. Open `http://localhost:3001/dev/cookie-test`. Always `localhost`, never `127.0.0.1`, because CORS allows only the exact address in `FRONTEND_URL`.
4. Open DevTools with right-click and **Inspect**, or `Ctrl + Shift + I`. On some laptops `F12` is the airplane-mode key, and in Edge `Ctrl + Shift + P` on the page opens Print.
5. Clear old cookies: **Application**, then **Storage** (under Application), then **Clear selected**.
6. Open **Network**, tick **Keep log** (Edge's name for Preserve log), and choose the **All** filter. With Fetch/XHR, the preflight row can be hidden.
7. Log in with `student01@studycircle.test` and the public demo password (typed by hand).

### Results

| Check | What was seen | Result |
|---|---|---|
| Preflight | `login` row, type `preflight`, status `204`. Response headers: `Access-Control-Allow-Origin: http://localhost:3001`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Headers: Content-Type,Accept`, `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE`, `Vary: Origin` | ✅ |
| Login | `POST /auth/login` status `200`, own data and own email in `data`, no token in the body | ✅ |
| Cookies | `access_token`: path `/`, 15 minutes, HttpOnly, SameSite Lax. `refresh_token`: path `/api/v1/auth`, 7 days, HttpOnly, SameSite Lax. Secure is empty in development. | ✅ |
| `document.cookie` | `(empty)` | ✅ |
| Me | `GET /auth/me` status `200` with own data. No preflight row, because a simple GET with only `Accept` does not need one. | ✅ |
| Refresh | `POST /auth/refresh` status `200`, `data: null`. Expiry times moved: access 13:31:06 → 13:33:56 GMT, refresh 28 Nov 13:16:06 → 13:18:56 GMT. The refresh value changed too. | ✅ |
| Logout | `POST /auth/logout` status `200`, `data: null`. The cookie table is empty after the reload arrow. | ✅ |
| Me after logout | `GET /auth/me` status `401`, `"Please log in to continue"`, `errors: []` | ✅ |

The red error count in DevTools after the last step is expected. The browser logs every `401` reply as an error.

The screenshots are in `screenshots/frontend_cookie_test/`.

**Safety: never let a token value show in a screenshot.**
- Edge cannot hide the Value column. Drag its border until it shows no letters.
- Selecting a cookie row opens a "Cookie Value" box at the bottom with the full token. Crop it out with `Windows + Shift + S`.
- Never screenshot the response headers of the login or refresh POST. The `Set-Cookie` lines hold the tokens. The preflight headers are safe.

---

## Part 5. Known Traps

| Trap | What happens | How the project handles it |
|---|---|---|
| (a) Cookies are not separated by port | On `localhost`, a cookie from any port is visible to every port. Another local app that sets `access_token` could clash with ours. | Clear site data before a test. Only run one app that uses these cookie names at a time. |
| (b) React StrictMode runs effects twice in development | A request inside `useEffect` runs twice. Two refreshes in a row fail, because a refresh token works only once. | Test requests run only on button clicks. Real pages must keep this in mind. |
| (c) The refresh cookie is sent only to `/api/v1/auth` | The browser does not send it to other routes, like `/users/me/profile`. | Correct by design. Only the auth routes need it. |
| `127.0.0.1` instead of `localhost` | A different origin. CORS refuses it and the cookies are not shared. | Always open `http://localhost:3001`. |
| Tailwind Preflight | Inputs and buttons lose their borders and become invisible on a dark page. | Inline border styles on the test page. Real pages get Tailwind classes in the design step. |
| `.env*` in `frontend/.gitignore` | Hides `.env.example` too. | `!.env.example` right after it (Step 9). |
| The access cookie lives 15 minutes | `/auth/me` gives `401` after a pause. | Log in again, or press Refresh. |

---

## Part 6. Folder Tree (new and changed)

```text
studycircle-peer_study_group_finder/
├── documentation/
│   └── frontend_setups/
│       └── nextjs_setup_v1.md                (NEW: this file)
├── screenshots/
│   └── frontend_cookie_test/                 (NEW: cookie test screenshots)
└── frontend/                                 (NEW: the Next.js project)
    ├── public/                               (scaffold SVG files)
    ├── src/
    │   ├── app/
    │   │   ├── dev/
    │   │   │   └── cookie-test/
    │   │   │       ├── page.tsx              (dev-only guard, 404 in production)
    │   │   │       └── cookie-test-panel.tsx (the test form and buttons)
    │   │   ├── favicon.ico
    │   │   ├── globals.css
    │   │   ├── layout.tsx
    │   │   └── page.tsx                      (scaffold welcome page, not changed yet)
    │   └── lib/
    │       └── api.ts                        (the one Axios client)
    ├── .env.example                          (committed, public values only)
    ├── .env.local                            (never committed)
    ├── .gitignore                            (CHANGED: !.env.example)
    ├── AGENTS.md
    ├── eslint.config.mjs
    ├── next.config.ts
    ├── package.json                          (CHANGED: port 3001, axios 1.21.1)
    ├── package-lock.json
    ├── README.md
    └── tsconfig.json
```

The planned folders `components/`, `hooks/`, and `types/` inside `src/` are created when the first real page needs them.

---

## Part 7. Commands

| Task | Folder | Command |
|---|---|---|
| Start the frontend | `frontend/` | `npm run dev` |
| Lint | `frontend/` | `npm run lint` |
| Production build | `frontend/` | `npm run build` |
| Run the production build | `frontend/` | `npm run start` |
| Check which version would be installed | root | `npm view package_name version` |
| Show the `package.json` changes | `frontend/` | `git --no-pager diff package.json` |
| See which rule ignores a path | root or `frontend/` | `git check-ignore -v path_here` (add `/` at the end for a folder that does not exist yet) |
| Prove there is no nested `.git` | root | `Test-Path frontend\.git` (must say `False`) |
| List every new frontend file | root | `git status --short --untracked-files=all frontend` |
| Make `.env.local` from the example | `frontend/` | `Copy-Item .env.example .env.local` |
| Turn off Next.js telemetry (optional) | `frontend/` | `npx next telemetry disable` |
| Open the cookie test | browser | `http://localhost:3001/dev/cookie-test` (API must run on 3000) |

---

## Part 8. Troubleshooting

| Symptom | Cause | Action |
|---|---|---|
| The page throws `NEXT_PUBLIC_API_URL is missing` | `frontend/.env.local` is missing, or the app was not restarted after it was made. | Copy it from `.env.example`, then restart `npm run dev`. |
| A test result says `status no reply` | The API is not running, or the browser blocked the reply because of CORS. | Start the API on port 3000. Check that the page is opened as `http://localhost:3001`, not `127.0.0.1`. Look for a CORS error in the Console. |
| `/auth/me` gives `401` right after a login | The access cookie expired (15 minutes), or old cookies clash. | Log in again. Clear site data first. |
| Refresh gives `401` | The refresh token was already used, or the person logged out. | This is the rule working. Log in again. |
| `git check-ignore` prints nothing for `node_modules` or `.next` | The folder does not exist yet, and the rule matches folders only. | Add a `/` at the end of the path. |
| Inputs or buttons are invisible | Tailwind Preflight removed their borders. | Give them a border (inline style in a skeleton, Tailwind classes in the design step). |
| `F12` turns on airplane mode | A laptop function key. | Use `Ctrl + Shift + I`, `Fn + F12`, or right-click and Inspect. |
| `Ctrl + Shift + P` opens Print | The page had focus, not DevTools. | Click inside DevTools first, or use the `+` in the DevTools top bar to open a panel. |
| `Slow filesystem detected` in the dev output | Usually Windows antivirus scanning the D: drive. | Harmless. |
| `LF will be replaced by CRLF` warning | Windows line endings. The backend has a `.gitattributes` file, the frontend does not yet. | Harmless. See Part 9. |
| `/dev/cookie-test` shows `404` | The app runs as a production build (`npm run start`). | Correct. Use `npm run dev` for the test. |

---

## Part 9. Notes for Later

1. **Delete the cookie test page before going live** (tracker item 52). Remove the whole `src/app/dev/` folder.
2. **Automatic refresh.** When the real login page is built, add an Axios response interceptor that calls `/auth/refresh` once after a `401` and repeats the first request. Make sure two requests at the same moment do not start two refreshes, because a refresh token works only once.
3. **ESLint 9 warning.** npm says `eslint@9.39.5` is no longer supported. It came from the Next.js scaffold. Check again when `eslint-config-next` supports a newer ESLint.
4. **`X-Powered-By: Express`.** The API's replies show this header, which tells strangers what server is used. A small backend task, not part of item 24.
5. **Root `.gitignore`.** It has the line `.next-env.d.ts` (with a leading dot), which matches nothing. The real file `next-env.d.ts` is already ignored by `frontend/.gitignore`, so nothing leaks. The root line can be fixed or removed in a small chore commit.
6. **Line endings.** The frontend has no `.gitattributes` file. Consider copying the backend's rule so every teammate gets the same line endings.
7. **Telemetry.** Next.js collects anonymous usage data. Turn it off with `npx next telemetry disable` if the team prefers.
8. **Network address.** `npm run dev` also listens on the laptop's Wi-Fi address (for example `192.168.x.x:3001`). Other devices on the same Wi-Fi could open it. The API's CORS still allows only `http://localhost:3001`, so cookies would not work from there.
9. **Cache Components and React Compiler** are off. Turn them on later only on purpose, with a new version of this file.

---

## Part 10. Rules to Never Forget

- Never create a nested `.git` inside `frontend/`. Use `--disable-git` when scaffolding.
- `.env.local` is never committed. Only `.env.example`, with public or fake values.
- `NEXT_PUBLIC_` values are public. Never put a secret in them.
- All API calls go through `src/lib/api.ts`. Never call the API with a hand-written address in a page.
- Never read, store, or log a token in the frontend. Tokens live only in HttpOnly cookies. No `localStorage`, no JSON, no console, no screenshot.
- Never use a Next.js proxy or rewrite to hide the two ports. The cookies are proven to work across ports.
- Open the app as `http://localhost:3001`, never `127.0.0.1`.
- Pin new packages to an exact, checked version. Check the `package.json` diff before every commit.
- Real pages follow the three-step UI workflow: blueprint, skeleton (plain HTML), then design (Tailwind).

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1 | 21 November 2026 | First version. Scaffold with `create-next-app` 16.4.6 and the chosen flags, port 3001, Axios 1.21.1 with `withCredentials`, the env files and the `.env.example` fix, the dev-only cookie test page, and the cookie test results (all five checks passed). |
