# StudyCircle — Postman Manual API Tests

**Tests done up to:** test 29, on 20 November 2026.
**Next test number:** 30.

## 1. What This File Is

This is one living file. It does two jobs.

1. **A guide to repeat the tests.** Every test has a number, what it is for, the method and URL, the JSON body, the manual steps, the expected reply, and the cleanup SQL. Use it when you want to run a test again.
2. **A record of the tests.** The log in Section 6 shows which tests were done and on which day. When more tests are done, add them to the log and keep counting. Do not start again from 01.

The file has no version number. It changes only by adding tests and dates. The screenshots for these tests are in `screenshots/postman_manual_api_testing/` at the repository root.

## 2. How to Use This File in Any Chat

Use this section when a new chat must continue the API tests.

**What to attach to the new chat:**
1. This file (`postman_manual_api_tests.md`).
2. The newest `studycircle_api_shape_v6.md` (the reply rules), or a newer one.
3. `studycircle_database_schema_mvp_v4.md` and `studycircle_fixed_values.md`.
4. The newest `nestjs_setup_v11.md` (or a newer one).

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
| Second seed student | id `3` | Made by the seed script. Name "Rafi Sarker" (checked on 20 November 2026). Used as "another person" in tests 24 and 25. |
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
| Own profile (`200`) | `data` with `id`, `name`, `department`, `academic_year`, `bio`, `subjects` (a list of `id` and `name`), the person's own `email`, and `role`. Checked on 20 November 2026. |
| Public profile (`200`) | `data` with `id`, `name`, `department`, `academic_year`, `bio`, `subjects`. No email, no role. Checked on 20 November 2026. |
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
| 20 | Own profile | `200`, own email and subjects | 20 November 2026 | `20-profile-own-success.png` |
| 21 | Edit own profile | `200`, bio saved without outer spaces | 20 November 2026 | `21-profile-edit-success.png` |
| 22 | Edit with an extra `role` field | `400`, nothing saved | 20 November 2026 | `22-profile-edit-role-refused.png` |
| 23 | Edit with a bad `academic_year` | `400`, the field is named | 20 November 2026 | `23-profile-edit-bad-year-refused.png` |
| 24 | Public profile of another student | `200`, no email, no role | 20 November 2026 | `24-profile-public-no-email.png` |
| 25 | Public profile of a suspended student | `404` | 20 November 2026 | `25-profile-public-suspended-404.png` |
| 26 | Add a subject | `201` | 20 November 2026 | `26-profile-subject-add-success.png` |
| 27 | Add the same subject again | `409` | 20 November 2026 | `27-profile-subject-add-duplicate-409.png` |
| 28 | Remove a subject | `200`, `{ "data": null }` | 20 November 2026 | `28-profile-subject-remove-success.png` |
| 29 | Own profile without a login | `401` | 20 November 2026 | `29-profile-own-no-login-401.png` |

**Rounds:**

| Round | Date | Tests | Notes |
|---|---|---|---|
| 1 | 17 November 2026 | 01 to 19 | Backend authentication (register, login, me, refresh, logout, suspension, rate limit). All passed. The screenshots show the messages of that day: lowercase auth messages and the `429` text `ThrottlerException: Too Many Requests`. Both were changed on 19 November 2026 (Section 7 shows the new text). |
| 2 | 20 November 2026 | 20 to 29 | Profile routes (own profile, edit, refused fields, public profile, suspended profile, subjects of interest, no login). All passed. Demo data was put back afterwards and checked in DBeaver. |

## 7. Test Details

The tests of round 1 depend on each other. Run them in order the first time. After that, each test says what it needs. The tests of round 2 (20 to 29) also run in order, because tests 27 and 28 use the subject added in test 26.

**Message wording.** On 19 November 2026 every auth message got a capital first letter, and the `429` message became a plain sentence (tracker item 53). The expected replies below show the new text. Screenshots 01 to 19 were taken on 17 November 2026, so they show the old lowercase text. They still prove the same behaviour.

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

**Suspend the second seed student** (before test 25):

```sql
UPDATE users SET status = 'suspended' WHERE id = 3;
```

**Restore the second seed student** (always do this right after the screenshot of test 25):

```sql
UPDATE users SET status = 'active' WHERE id = 3;
```

**Check the two seed students after round 2.** Both must be `active`. `student01` (id 2) must have `bio` NULL and 3 subjects, and id 3 must have 3 subjects:

```sql
SELECT u.id, u.name, u.status, u.bio, (SELECT COUNT(*) FROM user_subjects us WHERE us.user_id = u.id) AS subject_count FROM users u WHERE u.id IN (2, 3) ORDER BY u.id;
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
  "message": "This email is already registered",
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
  "message": "Email or password is not correct",
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

**Expected:** status `401`. The reply is exactly the same as test 05, with the message `Email or password is not correct`. No cookies.

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
  "message": "The session is not valid. Please log in again",
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
  "message": "Please log in to continue",
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

**Expected:** status `401`, with the message `The session is not valid. Please log in again`, the three keys, and no `data`.

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

**Expected:** status `401`, with the message `Please log in to continue`. It is the same message as "not logged in", on purpose.

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

**Expected:** status `401`, with the message `Email or password is not correct`. No `data`, no cookies.

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
  "message": "Too many requests. Please try again later",
  "errors": []
}
```

**Manual check:** in the response **Headers** tab, `Retry-After` is `60`.

**Message change (19 November 2026):** the message used to be the class name `ThrottlerException: Too Many Requests`. Since tracker item 53, the exception filter sends the plain sentence shown above. Screenshot 19 was taken before the change, so it still shows the old text.

**Screenshot:** `19-rate-limit-429.png`

```text
docs: add postman screenshot for the login rate limit.

Show the 429 reply when more than five login attempts are sent in one minute.
```

---

### Test 20 — Own profile

**What it is for:** shows that a logged-in person can read their own full profile, with their own email and subjects. The reply has no password hash, no account status, and no token.

**Before:** log in as `student01` with the body of test 14, in the same Postman window.

```text
GET http://localhost:3000/api/v1/users/me/profile
```

Body: none.

**Expected:** status `200 OK`. On 20 November 2026 the reply was:

```json
{
  "data": {
    "id": 2,
    "name": "Anika Rahman",
    "department": "Physics",
    "academic_year": 2,
    "bio": null,
    "subjects": [
      { "id": 3, "name": "Database Systems" },
      { "id": 11, "name": "Microeconomics" },
      { "id": 8, "name": "Physics I" }
    ],
    "email": "student01@studycircle.test",
    "role": "student"
  }
}
```

The subjects are sorted by name. No `password_hash`, no `status`, no token text.

**Manual step:** write down the `bio` value. Test 29 puts it back.

**Screenshot:** `20-profile-own-success.png`

```text
docs: add postman screenshot for the own profile route.

Show the 200 reply of GET /users/me/profile for the seed student, with her own email, department, year, bio, role, and subjects of interest sorted by name, and no password hash, status, or token in the body.
```

---

### Test 21 — Edit own profile

**What it is for:** shows that a person can change their own profile, and that the outer spaces of a text are removed before it is saved.

**Before:** logged in as `student01` (test 20).

```text
PATCH http://localhost:3000/api/v1/users/me
```

Body (raw, JSON). The spaces at both ends are there on purpose:

```json
{
  "bio": "  Testing the profile route  "
}
```

**Expected:** status `200 OK`. The reply is the full own profile (the same shape as test 20), with `"bio": "Testing the profile route"` and no spaces at the ends. Every other field is unchanged.

**Screenshot:** `21-profile-edit-success.png` (show the request body and the reply).

```text
docs: add postman screenshot for a successful profile edit.

Show the 200 reply of PATCH /users/me when the seed student changes her bio, with the outer spaces removed from the saved text and every other field unchanged.
```

---

### Test 22 — Edit with an extra `role` field

**What it is for:** shows that nobody can make themselves an admin through the profile edit. The whole request is refused, so even the valid part is not saved.

**Before:** logged in as `student01`.

```text
PATCH http://localhost:3000/api/v1/users/me
```

Body (raw, JSON):

```json
{
  "bio": "Should not be saved",
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

**Manual check:** send `GET /users/me/profile`. The `bio` must still be `Testing the profile route`, not `Should not be saved`. (Checked on 20 November 2026.)

**Screenshot:** `22-profile-edit-role-refused.png` (show the request body and the reply).

```text
docs: add postman screenshot for a refused role field in the profile edit.

Show the 400 reply with the message property role should not exist when a profile edit tries to send a role field, which proves a student cannot make themselves an admin and that nothing in the refused request is saved.
```

---

### Test 23 — Edit with a bad `academic_year`

**What it is for:** shows that the year must be a whole number from 1 to 6, and that the error names the field in snake_case.

**Before:** logged in as `student01`.

```text
PATCH http://localhost:3000/api/v1/users/me
```

Body (raw, JSON):

```json
{
  "academic_year": 7
}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "academic_year", "message": "academic_year must not be greater than 6" }
  ]
}
```

**Screenshot:** `23-profile-edit-bad-year-refused.png` (show the request body and the reply).

```text
docs: add postman screenshot for a refused academic year in the profile edit.

Show the 400 reply when academic_year is 7, with the errors list naming the field in snake_case and the message saying it must not be greater than 6.
```

---

### Test 24 — Public profile of another student

**What it is for:** shows what a leader will see when a student asks to join a group. The public profile has no email and no role.

**Before:** logged in as `student01`. The second seed student (id `3`) is `active`.

```text
GET http://localhost:3000/api/v1/users/3/profile
```

Body: none.

**Expected:** status `200 OK`. The keys are exactly `id`, `name`, `department`, `academic_year`, `bio`, `subjects`. On 20 November 2026 the reply was:

```json
{
  "data": {
    "id": 3,
    "name": "Rafi Sarker",
    "department": "Mathematics",
    "academic_year": 1,
    "bio": "Retaking a course and want steady practice.",
    "subjects": [
      { "id": 5, "name": "Calculus I" },
      { "id": 9, "name": "Digital Logic Design" },
      { "id": 12, "name": "Technical Writing" }
    ]
  }
}
```

No `email`, no `role`, no `status`, no `password_hash`.

**Screenshot:** `24-profile-public-no-email.png`

```text
docs: add postman screenshot for a public profile without email.

Show the 200 reply of GET /users/3/profile, where one student views another student's public profile with only the name, department, year, bio, and subjects, and no email, role, status, or password hash.
```

---

### Test 25 — Public profile of a suspended student

**What it is for:** shows that a suspended account never appears in a public view. The reply is the same `404` as an unknown id, so nobody can tell that the account exists.

**Before:** logged in as `student01`. Suspend the second seed student with the SQL in "Cleanup SQL" above.

```text
GET http://localhost:3000/api/v1/users/3/profile
```

Body: none.

**Expected:** status `404 Not Found`.

```json
{
  "status_code": 404,
  "message": "This profile does not exist",
  "errors": []
}
```

**Cleanup (right after the screenshot):** restore the second seed student with the SQL above, then send the test 24 request again. It must give `200`.

**Screenshot:** `25-profile-public-suspended-404.png`

```text
docs: add postman screenshot for the public profile of a suspended student.

Show the 404 reply with the message This profile does not exist when a student asks for the public profile of a suspended account, which is the same reply as an unknown id, so nobody can tell that the hidden account exists.
```

---

### Test 26 — Add a subject

**What it is for:** shows that a student can add a subject of interest. The reply is the added subject with only its id and name.

**Before:** logged in as `student01`. Pick an active subject that is not in her list. On 20 November 2026 subject `5` ("Calculus I") was free.

```text
POST http://localhost:3000/api/v1/users/me/subjects
```

Body (raw, JSON):

```json
{
  "subject_id": 5
}
```

**Expected:** status `201 Created`.

```json
{
  "data": {
    "id": 5,
    "name": "Calculus I"
  }
}
```

**Screenshot:** `26-profile-subject-add-success.png` (show the request body and the reply).

```text
docs: add postman screenshot for adding a subject of interest.

Show the 201 reply of POST /users/me/subjects when the seed student adds an active subject that is not yet in her list, with only the subject id and name in the body.
```

---

### Test 27 — Add the same subject again

**What it is for:** shows that the same subject cannot be added twice, with a clear message instead of a database error.

**Before:** test 26 is done.

```text
POST http://localhost:3000/api/v1/users/me/subjects
```

Body: the same as test 26.

**Expected:** status `409 Conflict`.

```json
{
  "status_code": 409,
  "message": "This subject is already in your list",
  "errors": []
}
```

**Screenshot:** `27-profile-subject-add-duplicate-409.png` (show the request body and the reply).

```text
docs: add postman screenshot for adding the same subject twice.

Show the 409 reply with the message This subject is already in your list when the same subject is added a second time, instead of the general database message.
```

---

### Test 28 — Remove a subject

**What it is for:** shows that a student can remove a subject from their own list. This also puts the list back to the seed state.

**Before:** test 26 is done (subject `5` is in the list).

```text
DELETE http://localhost:3000/api/v1/users/me/subjects/5
```

Body: none.

**Expected:** status `200 OK`.

```json
{
  "data": null
}
```

**Screenshot:** `28-profile-subject-remove-success.png`

```text
docs: add postman screenshot for removing a subject of interest.

Show the 200 reply with an empty data value when the seed student removes a subject from her own list, which also puts her list back to the seed state.
```

---

### Test 29 — Own profile without a login

**What it is for:** shows that the profile routes are locked. Without a login cookie, the reply is `401` with no profile data.

**Before:**
1. Logged in as `student01`. Put the bio back to the value written down in test 20 (it was `null` on 20 November 2026): `PATCH http://localhost:3000/api/v1/users/me` with the body `{ "bio": null }`. Expect `200`.
2. Send `GET /users/me/profile` and check that it matches test 20 again.
3. Log out: `POST http://localhost:3000/api/v1/auth/logout`, body none. Expect `200` with `{ "data": null }`.

```text
GET http://localhost:3000/api/v1/users/me/profile
```

Body: none.

**Expected:** status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "Please log in to continue",
  "errors": []
}
```

**Cleanup:** run the "Check the two seed students after round 2" query in DBeaver. Both rows must match the expected values.

**Screenshot:** `29-profile-own-no-login-401.png`

```text
docs: add postman screenshot for the own profile without a login.

Show the 401 reply with the message Please log in to continue when the own profile route is called after logout, which proves that the profile routes are locked without a login cookie.
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
