# StudyCircle — Postman Manual API Tests

**Tests done up to:** test 19, on 17 November 2026.
**Next test number:** 20.

## 1. What This File Is

This is one living file. It does two jobs.

1. **A guide to repeat the tests.** Every test has a number, what it is for, the method and URL, the JSON body, the manual steps, the expected reply, and the cleanup SQL. Use it when you want to run a test again.
2. **A record of the tests.** The log in Section 6 shows which tests were done and on which day. When more tests are done, add them to the log and keep counting. Do not start again from 01.

The file has no version number. It changes only by adding tests and dates. The screenshots for these tests are in `screenshots/postman_manual_api_testing/` at the repository root.

## 2. How to Use This File in Any Chat

Use this section when a new chat must continue the API tests.

**What to attach to the new chat:**
1. This file (`postman_manual_api_tests.md`).
2. `studycircle_api_shape_v3.md` (the reply rules).
3. `studycircle_database_schema_mvp_v4.md` and `studycircle_fixed_values.md`.
4. The newest `nestjs_setup_v8.md` (or a newer one).

**Rules for the chat (Claude):**
1. Read the log in Section 6. Find the highest test number. Continue from the next number.
2. Give **one test at a time**. For each test, give only the method and URL, the JSON body, the manual steps, and the expected output. Wait for the person to paste the real output. Then check it against the expected output.
3. Never ask for or show real tokens, token hashes, cookie values, `.env` content, or real passwords. Only the throwaway demo passwords in Section 5 may appear.
4. Do not start a new test if the last one gave a surprise. Find out why first.
5. When a test is finished, follow Section 3.

## 3. When a Test Is Finished

After each test, the person takes a screenshot. The chat then gives two things:

1. **A screenshot name.** Use the pattern `NN-short-name.png`. `NN` is the next free number, with two digits. The words are lowercase with hyphens. Example: `20-group-create-success.png`. Check that the number is not already used. Save it in `screenshots/postman_manual_api_testing/`.
2. **A commit message.** Use the format from `git_commit_guide.md`: the type `docs:`, a lowercase first line that ends with a period, one blank line, then one flowing paragraph. No bullet points. Example:

```text
docs: add postman screenshot for group create.

Show the 201 reply when a leader creates a group, with only the safe fields in the response.
```

**Check every screenshot before the commit:**
1. No cookie token values, no `.env` content, no real password.
2. The Postman helper bars ("Fix 401", "Add tests", "Change method") are closed. Click **Decline**.
3. The status code and the reply are both visible.

**After the screenshot is committed:** the chat adds the test to Section 6 (log) and Section 7 (details), and updates the two lines at the top of this file ("Tests done up to" and "Next test number"). Then commit this file with a message like:

```text
docs: update postman manual api tests.

Add tests 20 to 22 for group creation to the log and the details, with the date they were done.
```

## 4. Before You Start

1. Start the backend: open the terminal in `backend/` and run `npm run start:dev`. It must show `Found 0 errors`.
2. The base address is `http://localhost:3000/api/v1`. Every URL below starts with it.
3. In Postman, keep **No Environment** selected. Cookies are saved by Postman for `localhost`. Send the requests in the same Postman window, so the cookies are kept.
4. The seed data must exist. If it does not, run `npm run seed` in `backend/`. This wipes the development database first.
5. The access cookie lives **15 minutes**. If a protected route (like `me`) gives `401` after a break, log in again first.
6. Login and register allow **5 calls per minute** per address. Refresh allows 20. If a call gives `429`, wait 60 seconds, or restart the backend (the counts are in memory and reset when the server restarts).
7. Postman shows helper bars ("Fix 401 Unauthorized error", "Add tests", "Change method to POST"). They are not part of the project. Click **Decline**. Do not "fix" the project because of them.
8. A `GET` request should have no body. If you reuse a `POST` tab for a `GET` request, clear the body.

## 5. Demo Data Used by the Tests

| Item | Value | Notes |
|---|---|---|
| Postman test account | `postman01@studycircle.test` | Made by test 01. Password `Postman@123`. Role `student`. |
| Seed student | `student01@studycircle.test` | Made by the seed script. Password `Student@12345`. Name "Anika Rahman" (checked on 17 November 2026). Seed ids start at 2 for the first student. |
| Seed admin | `admin@studycircle.test` | Password is `SEED_ADMIN_PASSWORD` from `backend/.env`. Never write it here. |
| Unknown email | `nobody99@studycircle.test` | Has no account. Used in test 06. |
| Wrong password | `WrongPass@999` | A throwaway value for the wrong-password tests. |

All passwords above except the admin one are throwaway demo values. They are safe to show in a screenshot.

**Ids change.** The `postman01` account had id 32, and then id 34, because ids are never reused after a delete. Do not expect a fixed id in the reply. Check that the field exists and that the other fields look right.

**What the replies look like (checked on 17 November 2026):**

| Reply | Shape |
|---|---|
| Register success (`201`) | `data` with `id`, `name`, `department`, `academic_year`, `bio`, `role`. No email, no hash. |
| Login success and `me` (`200`) | `data` with the same fields, plus the person's own `email`. No token text. |
| Action with nothing to return (`200`) | `{ "data": null }` |
| Any error | `status_code`, `message`, `errors` (a list, empty unless it is a form error) |

## 6. Test Log

| # | Test | Result | Date done | Screenshot |
|---|---|---|---|---|
| 01 | Register success | `201`, safe fields only | 17 November 2026 | `01-register-success.png` |
| 02 | Register with a duplicate email | `409` | 17 November 2026 | `02-register-duplicate-email.png` |
| 03 | Register with an extra `role` field | `400` | 17 November 2026 | `03-register-role-field-refused.png` |
| 04 | Register with a short password | `400` | 17 November 2026 | `04-register-short-password-refused.png` |
| 05 | Login with a wrong password | `401` | 17 November 2026 | `05-login-wrong-password.png` |
| 06 | Login with an unknown email | `401`, same message as 05 | 17 November 2026 | `06-login-unknown-email.png` |
| 07 | Login success | `200`, own data, two cookies | 17 November 2026 | `07-login-success-cookies.png` |
| 08 | `me` while logged in | `200` | 17 November 2026 | `08-me-logged-in.png` |
| 09 | Refresh success | `200`, `{ "data": null }` | 17 November 2026 | `09-refresh-success.png` |
| 10 | Refresh with an old (used) token | `401` | 17 November 2026 | `10-refresh-old-token-refused.png` |
| 11 | Logout | `200`, `{ "data": null }` | 17 November 2026 | `11-logout-success.png` |
| 12 | `me` after logout | `401` | 17 November 2026 | `12-me-after-logout.png` |
| 13 | Refresh with a cancelled token | `401` | 17 November 2026 | `13-refresh-cancelled-token-refused.png` |
| 14 | Login as the seed student | `200` | 17 November 2026 | `14-login-seed-student.png` |
| 15 | `me` with a suspended account | `401` at once | 17 November 2026 | `15-me-suspended-account.png` |
| 16 | Login with a suspended account | `401`, same message as 05 | 17 November 2026 | `16-login-suspended-account.png` |
| 17 | DBeaver: refresh token hashes | 64 hex characters, cancelled rows flagged | 17 November 2026 | `17-dbeaver-refresh-token-hash.png` |
| 18 | DBeaver: password hashes | bcrypt, `$2b$`, length 60 | 17 November 2026 | `18-dbeaver-password-hash.png` |
| 19 | Login rate limit | `429`, `Retry-After: 60` | 17 November 2026 | `19-rate-limit-429.png` |

**Rounds:**

| Round | Date | Tests | Notes |
|---|---|---|---|
| 1 | 17 November 2026 | 01 to 19 | Backend authentication (register, login, me, refresh, logout, suspension, rate limit). All passed. One known issue: the `429` message is `ThrottlerException: Too Many Requests` and is not a plain sentence. It is listed as an open item in `studycircle_api_shape_v3.md`. |

## 7. Test Details

The tests of round 1 depend on each other. Run them in order the first time. After that, each test says what it needs.

### Cleanup SQL (DBeaver, database `studycircle`)

Run these in DBeaver, connected to the `studycircle` database (not `studycircle_test`).

**Delete the Postman test account** (use this before test 01 if the account already exists). Its refresh tokens are deleted with it, because that foreign key uses `Cascade`:

```sql
DELETE FROM users WHERE email = 'postman01@studycircle.test';
```

**Suspend the seed student** (before tests 15 and 16):

```sql
UPDATE users SET status = 'suspended' WHERE email = 'student01@studycircle.test';
```

**Restore the seed student** (always do this after tests 15 and 16, because the demo uses this account):

```sql
UPDATE users SET status = 'active' WHERE email = 'student01@studycircle.test';
```

---

### Test 01 — Register success

**What it is for:** shows that a new person can make an account, and that the reply holds only safe fields (no email, no password hash).

**Before:** the account `postman01@studycircle.test` must not exist. If it does, run the delete SQL above.

```text
POST http://localhost:3000/api/v1/auth/register
```

Body (raw, JSON):

```json
{
  "name": "Postman One",
  "email": "postman01@studycircle.test",
  "password": "Postman@123",
  "department": "CSE",
  "academic_year": 2
}
```

**Expected:** status `201 Created`. `data` has `id`, `name`, `department`, `academic_year`, `bio` (null), and `role` (`student`). No `email`, no `password_hash`, no cookies.

**Edit next time:** to make a second test account, change `name` and `email` (for example `postman02@studycircle.test`).

**Screenshot:** `01-register-success.png`

```text
docs: add postman screenshot for successful register.

Show a 201 reply for a new student account, with only the safe fields and no email or password hash in the response.
```

---

### Test 02 — Register with a duplicate email

**What it is for:** shows that the same email cannot be used twice.

**Before:** test 01 must have been done (the account exists).

```text
POST http://localhost:3000/api/v1/auth/register
```

Body: the same as test 01.

**Expected:** status `409 Conflict`. The reply is:

```json
{
  "status_code": 409,
  "message": "this email is already registered",
  "errors": []
}
```

No `data` key.

**Screenshot:** `02-register-duplicate-email.png`

```text
docs: add postman screenshot for duplicate email register.

Show the 409 reply when the same email is registered a second time.
```

---

### Test 03 — Register with an extra `role` field

**What it is for:** shows that nobody can make themselves an admin at register time. A field that the route does not list is refused.

```text
POST http://localhost:3000/api/v1/auth/register
```

Body (use a new email, so the extra field is the only problem):

```json
{
  "name": "Postman Two",
  "email": "postman02@studycircle.test",
  "password": "Postman@123",
  "department": "CSE",
  "academic_year": 2,
  "role": "admin"
}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "role", "message": "property role should not exist" }
  ]
}
```

No account is created.

**Screenshot:** `03-register-role-field-refused.png`

```text
docs: add postman screenshot for refused role field.

Show the 400 reply when a register request tries to send a role field, which proves nobody can register as admin.
```

---

### Test 04 — Register with a short password

**What it is for:** shows that the password must be at least 8 characters.

```text
POST http://localhost:3000/api/v1/auth/register
```

Body (use a new email):

```json
{
  "name": "Postman Three",
  "email": "postman03@studycircle.test",
  "password": "Ab@12",
  "department": "CSE",
  "academic_year": 2
}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "password", "message": "password must be longer than or equal to 8 characters" }
  ]
}
```

No account is created.

**Note:** tests 01 to 04 are 4 register calls. The register limit is 5 per minute. Do not send more than 5 in one minute.

**Screenshot:** `04-register-short-password-refused.png`

```text
docs: add postman screenshot for refused short password.

Show the 400 reply when the password is shorter than eight characters.
```

---

### Test 05 — Login with a wrong password

**What it is for:** shows that a wrong password gives a general message that does not say which part was wrong.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (the email is real, the password is wrong):

```json
{
  "email": "postman01@studycircle.test",
  "password": "WrongPass@999"
}
```

**Expected:** status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "email or password is not correct",
  "errors": []
}
```

No `data` key. The Cookies tab stays empty (no cookie is set).

**Screenshot:** `05-login-wrong-password.png`

```text
docs: add postman screenshot for login with a wrong password.

Show the general 401 reply for a correct email with a wrong password.
```

---

### Test 06 — Login with an unknown email

**What it is for:** shows that an email with no account gets exactly the same reply as a wrong password. A stranger cannot find out which emails have an account.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body:

```json
{
  "email": "nobody99@studycircle.test",
  "password": "WrongPass@999"
}
```

**Expected:** status `401`. The reply is exactly the same as test 05, with the message `email or password is not correct`. No cookies.

**Screenshot:** `06-login-unknown-email.png`

```text
docs: add postman screenshot for login with an unknown email.

Show that an unknown email gives exactly the same 401 message as a wrong password, so the reply does not reveal which emails have an account.
```

---

### Test 07 — Login success

**What it is for:** shows that login gives the person's own data, with no token in the JSON, and that the tokens are set as two HttpOnly cookies.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body:

```json
{
  "email": "postman01@studycircle.test",
  "password": "Postman@123"
}
```

**Expected:** status `200 OK`. `data` has `id`, `name`, `department`, `academic_year`, `bio`, `role`, and the person's own `email`. No `password_hash`, no `token_hash`, no token text.

**Manual check (cookies):** open the **Cookies** tab for `localhost`. It must list two cookies:
1. `access_token`: path `/`, marked HttpOnly.
2. `refresh_token`: path `/api/v1/auth`, marked HttpOnly.

**Safety:** the cookie values are real tokens. Do not screenshot the values. Show only the JSON reply.

**Screenshot:** `07-login-success-cookies.png`

```text
docs: add postman screenshot for successful login.

Show the 200 reply with the own data of the logged-in person, with no tokens and no password hash in the body.
```

---

### Test 08 — `me` while logged in

**What it is for:** shows that a logged-in person can read their own data, and that the login cookie works.

**Before:** do test 07 first, in the same Postman window. The access cookie lives 15 minutes. If it has expired, log in again.

```text
GET http://localhost:3000/api/v1/auth/me
```

Body: none.

**Expected:** status `200 OK`, and `data` has the same own data as the login reply. No token text, no hash.

**If it gives `401`:** the cookie expired or was not kept. Log in again (test 07), then send `me` in the same window.

**Screenshot:** `08-me-logged-in.png`

```text
docs: add postman screenshot for the me route when logged in.

Show the 200 reply with the own data of the logged-in person.
```

---

### Test 09 — Refresh success

**What it is for:** shows that a valid refresh cookie gives a new pair of cookies, and the reply has no token text.

**Before:** be logged in (test 07).

**Manual step (save the old cookie for test 10):** before you send the refresh, open the Cookies tab for `localhost`, click the `refresh_token` cookie, and copy its **full text** (it holds the name, value, path, and expiry). Keep it in a private note. Never paste it in a chat, a file, or Git.

```text
POST http://localhost:3000/api/v1/auth/refresh
```

Body: none.

**Expected:** status `200 OK`, and the reply is:

```json
{
  "data": null
}
```

**Manual check:** the Cookies tab still shows two cookies, and their values are now different from before. Do not show the values.

**Screenshot:** `09-refresh-success.png`

```text
docs: add postman screenshot for a successful token refresh.

Show the 200 reply with an empty data value and no token text in the body when a valid refresh cookie is sent.
```

---

### Test 10 — Refresh with an old (used) token

**What it is for:** shows that a refresh token works only once. When a used token is sent again, the server refuses it and cancels all refresh tokens of that person.

**Before:** test 09 is done, and you have the old full cookie text from the private note.

**Manual steps:**
1. Open the Cookies tab for `localhost` and click the `refresh_token` cookie to edit it.
2. Select everything in the text box and paste the saved old text over it.
3. Check that the text still starts with `refresh_token=`, has `Path=/api/v1/auth`, and has an `Expires` date in the future.
4. Click **Save**.

```text
POST http://localhost:3000/api/v1/auth/refresh
```

Body: none.

**Expected:** status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "the session is not valid. please log in again",
  "errors": []
}
```

No `data` key, no token text. All refresh tokens of this person are now cancelled. Log in again before the next test.

**Screenshot:** `10-refresh-old-token-refused.png`

```text
docs: add postman screenshot for reuse of an old refresh token.

Show the 401 reply when an already used refresh token is sent again, which also cancels every refresh token of that person.
```

---

### Test 11 — Logout

**What it is for:** shows that logout clears the cookies and cancels the refresh token.

**Before:** log in again (test 07 body). Then, **before** the logout, copy the current `refresh_token` full cookie text into a private note. Test 13 needs it.

```text
POST http://localhost:3000/api/v1/auth/logout
```

Body: none.

**Expected:** status `200 OK`, and the reply is:

```json
{
  "data": null
}
```

**Manual check:** the Cookies tab no longer lists `access_token` and `refresh_token` for `localhost`.

**Screenshot:** `11-logout-success.png`

```text
docs: add postman screenshot for logout.

Show the 200 reply with an empty data value after the person logs out.
```

---

### Test 12 — `me` after logout

**What it is for:** shows that the route is locked again after logout.

```text
GET http://localhost:3000/api/v1/auth/me
```

Body: none.

**Expected:** status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "please log in to continue",
  "errors": []
}
```

No `data` key. If it gives `200`, stop: the access cookie was not removed.

**Screenshot:** `12-me-after-logout.png`

```text
docs: add postman screenshot for the me route after logout.

Show the 401 reply when the me route is called without a login.
```

---

### Test 13 — Refresh with a cancelled token

**What it is for:** shows that the refresh token cancelled at logout cannot be used again.

**Before:** you have the full cookie text saved before the logout (test 11).

**Manual steps:**
1. Open the Cookies tab for `localhost`. Add or edit the `refresh_token` cookie.
2. Paste the saved full text. It must start with `refresh_token=` and have `Path=/api/v1/auth`.
3. Check that the `Expires` date is in the future, then click **Save**.

```text
POST http://localhost:3000/api/v1/auth/refresh
```

Body: none.

**Expected:** status `401`, with the message `the session is not valid. please log in again`, the three keys, and no `data`.

**Tip:** if the Cookies tab has no add option, put the cookie in a `Cookie` header on the request instead. Remove the header afterwards.

**Screenshot:** `13-refresh-cancelled-token-refused.png`

```text
docs: add postman screenshot for a cancelled refresh token.

Show the 401 reply when the refresh token that was cancelled at logout is sent again.
```

---

### Test 14 — Login as the seed student

**What it is for:** shows that the demo accounts made by the seed script work with the real login code.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body:

```json
{
  "email": "student01@studycircle.test",
  "password": "Student@12345"
}
```

**Expected:** status `200 OK`. `data` has the seed student's own data (name "Anika Rahman" on 17 November 2026) and `role` `student`. No hash, no token text. Two new cookies are set. Keep the cookies for test 15.

**Screenshot:** `14-login-seed-student.png`

```text
docs: add postman screenshot for login with a seed student.

Show that the demo accounts made by the seed script can log in with the new login code.
```

---

### Test 15 — `me` with a suspended account

**What it is for:** shows that a suspension works at once. The guard reads the account status from the database on every request, even if the access token has not expired.

**Before:** log in as `student01` (test 14). Send `me` once and check that it gives `200`. If you took a break, log in again first, because the access cookie lives 15 minutes.

**Step 1, DBeaver** (`studycircle`):

```sql
UPDATE users SET status = 'suspended' WHERE email = 'student01@studycircle.test';
```

**Step 2, Postman,** right after the SQL, with the same cookies:

```text
GET http://localhost:3000/api/v1/auth/me
```

Body: none.

**Expected:** status `401`, with the message `please log in to continue`. It is the same message as "not logged in", on purpose.

Do **not** restore the account yet. Test 16 needs it suspended.

**Screenshot:** `15-me-suspended-account.png`

```text
docs: add postman screenshot for a suspended account on the me route.

Show the 401 reply at once after an admin suspends the account, even though the access token has not expired yet.
```

---

### Test 16 — Login with a suspended account

**What it is for:** shows that a suspended person gets the same general `401` as a wrong password, so the reply does not show that the account exists.

**Before:** `student01` is still suspended (test 15).

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (the password is correct):

```json
{
  "email": "student01@studycircle.test",
  "password": "Student@12345"
}
```

**Expected:** status `401`, with the message `email or password is not correct`. No `data`, no cookies.

**Cleanup (after the screenshot):** restore the account in DBeaver. If you restore it before the screenshot, the login would succeed with `200`.

```sql
UPDATE users SET status = 'active' WHERE email = 'student01@studycircle.test';
```

**Screenshot:** `16-login-suspended-account.png`

```text
docs: add postman screenshot for login with a suspended account.

Show that a suspended account gets the same general 401 message as a wrong password.
```

---

### Test 17 — DBeaver: refresh token hashes

**What it is for:** shows that only 64-character hashes of refresh tokens are stored, never the raw cookie value, and that cancelled tokens are flagged.

**Run in DBeaver** (`studycircle`). The query never selects `token_hash`, so no hash can show in the screenshot:

```sql
SELECT id, user_id, length(token_hash) AS hash_length, token_hash ~ '^[0-9a-f]{64}$' AS is_64_hex, revoked_at IS NOT NULL AS is_revoked, expires_at, created_at FROM refresh_tokens ORDER BY id DESC LIMIT 10;
```

**Expected:**
1. `hash_length` is `64` and `is_64_hex` is true on every row.
2. Rows for the `postman01` account (cancelled by the reuse in test 10, the logout in test 11, and the reuse in test 13) show `is_revoked` as true.
3. The newest rows of `student01` show `is_revoked` as false, because they were never logged out.

**Screenshot:** `17-dbeaver-refresh-token-hash.png`

```text
docs: add dbeaver screenshot for stored refresh token hashes.

Show that the refresh tokens table holds only sixty-four character hashes, with cancelled tokens flagged as revoked and the hash values never shown.
```

---

### Test 18 — DBeaver: password hashes

**What it is for:** shows that passwords are stored as bcrypt hashes, both for an account made by the register code and for an account made by the seed script.

**Run in DBeaver** (`studycircle`). The query shows only the start of the hash:

```sql
SELECT id, email, left(password_hash, 4) AS hash_start, length(password_hash) AS hash_length, password_hash LIKE '$2b$%' AS is_bcrypt FROM users WHERE email IN ('postman01@studycircle.test', 'student01@studycircle.test') ORDER BY id;
```

**Expected:** 2 rows. `hash_start` is `$2b$`, `hash_length` is `60`, and `is_bcrypt` is true on both rows. No full hash is shown.

**Screenshot:** `18-dbeaver-password-hash.png`

```text
docs: add dbeaver screenshot for the stored password hash.

Show that the password is stored as a bcrypt hash and never as plain text.
```

---

### Test 19 — Login rate limit

**What it is for:** shows that too many login tries in one minute are blocked, so passwords cannot be guessed quickly.

**Before:** wait 60 seconds, so earlier login calls are no longer counted. (Or restart the backend, because the counts are in memory.)

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (the same each time):

```json
{
  "email": "postman01@studycircle.test",
  "password": "WrongPass@999"
}
```

**Manual steps:** click **Send** 6 times, one after the other, as fast as you can. Calls 1 to 5 give `401`. Call 6 gives `429`.

**Expected on the `429` call:** status `429 Too Many Requests`.

```json
{
  "status_code": 429,
  "message": "ThrottlerException: Too Many Requests",
  "errors": []
}
```

**Manual check:** in the response **Headers** tab, `Retry-After` is `60`.

**Known issue:** the message is a class name and not a plain sentence. It is an open item in `studycircle_api_shape_v3.md`. When it is fixed, update the expected message here.

**Screenshot:** `19-rate-limit-429.png`

```text
docs: add postman screenshot for the login rate limit.

Show the 429 reply when more than five login attempts are sent in one minute.
```

---

## 8. Template for a New Test

Copy this block for every new test. Use the next free number.

````text
### Test NN — Short name

**What it is for:** one or two plain sentences.

**Before:** what must exist or be done first (login, a group, a cookie, a SQL step).

Method and URL, JSON body.

**Manual steps:** cookie copy or replace, waiting, SQL, and so on.

**Expected:** status, the reply shape, and the fields that must not appear.

**Cleanup:** SQL or steps to put things back, if needed.

**Screenshot:** `NN-short-name.png`

Commit message (type `docs:`, first line ends with a period, one blank line, one paragraph).
````

After the test is added here, also add one row to the log in Section 6, and update the two lines at the top of this file.
