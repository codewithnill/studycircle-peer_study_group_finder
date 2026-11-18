# StudyCircle — Auth Testing Guide (Postman and DBeaver)

**Written:** 17 November 2026
**Scope:** The backend auth routes (Part 7 of `nestjs_setup_v8.md`). This is the same round of 19 tests that was done for the screenshots in `screenshots/postman/`.
**Reply shapes:** every expected reply follows `studycircle_api_shape_v3.md`.

> **What this file is:** a repeatable test sheet. Use it any time you want to run the auth tests again, for example after changing the auth code, before a demo, or before a submission.
> **How to use it:** read "Before you start" once. Then run the tests in order, from 01 to 19. Each test says what it is for, what to send, what you should see, and what to edit if you run it again.

---

## 1. Before You Start

### 1.1 What must be running

| Item | How to check |
|---|---|
| PostgreSQL | DBeaver connects to `studycircle` on `localhost:5432`. |
| The backend | In `backend/`, run `npm run start:dev`. The log says `Found 0 errors`. |
| Postman | Top right shows **No Environment**. Use one request tab per route, or reuse one tab and change the method, URL, and body. |

### 1.2 Base address

```text
http://localhost:3000/api/v1
```

All URLs below start with this. The auth routes sit under `/auth`.

### 1.3 The two test accounts

| Account | Email | Password | How it was made | Used in tests |
|---|---|---|---|---|
| Postman account | `postman01@studycircle.test` | `Postman@123` | By the real register route (test 01) | 01 to 13, 19 |
| Seed student | `student01@studycircle.test` | `Student@12345` | By `npm run seed` | 14 to 16 |

Both passwords are throwaway demo values. They are safe to show in a screenshot. Never reuse them for a real account.

**Ids change.** The `id` in a reply (for example `34` or `2`) depends on the database. If you delete and register the account again, the new id is bigger, because ids are never reused. This is normal.

**If the seed student does not exist** (for example the database was reset), run `npm run seed` from `backend/`. Remember that the seed wipes the development database first.

### 1.4 Rate limits (important)

| Route | Limit per minute (per address) |
|---|---|
| `POST /auth/register` | 5 |
| `POST /auth/login` | 5 |
| `POST /auth/refresh` | 20 |
| Everything else | 100 |

When a call gives `429`, wait 60 seconds. The count is in memory, so **restarting the backend also clears it**.

### 1.5 How cookies work in Postman

1. After a successful login, Postman saves two cookies for `localhost` by itself. It sends them again on the next request.
2. To see them, click **Cookies** (top right of the request area, or the **Cookies** tab under the reply).
3. The two cookies are:

| Cookie | Path | Lives |
|---|---|---|
| `access_token` | `/` | 15 minutes |
| `refresh_token` | `/api/v1/auth` | 7 days |

4. **Copy a whole cookie:** open the cookie, select all the text in the box (it holds the name, value, path, and expiry together), and copy it into a **private note**. Never paste it in chat, in Git, or in a screenshot.
5. **Put a copied cookie back:** open the same cookie, select all, paste your saved text, check that it still starts with `refresh_token=` and has `Path=/api/v1/auth` and a future `Expires` date, then click **Save**.
6. **The 15-minute rule:** the access cookie expires after 15 minutes. If `me` gives `401` when it should give `200`, log in again first.

### 1.5.1 Postman helper bars

Postman sometimes shows an orange or purple bar like "Fix 401 Unauthorized error" or "Add tests". It is a Postman helper. It is not part of the project. Click **Decline**. Do not let it "fix" anything. Close it before you take a screenshot.

### 1.6 Safety rules for screenshots

1. Never show cookie values, `.env`, or a real password.
2. Show only names, paths, and flags (HttpOnly) if you show cookies at all.
3. Check every image before you push.

---

## 2. Quick Map of the 19 Tests

| # | Name | Account | What it proves |
|---|---|---|---|
| 01 | Register success | postman01 | A new student account can be made. No email or hash in the reply. |
| 02 | Register duplicate email | postman01 | The same email cannot register twice. |
| 03 | Register with a `role` field | new email | Nobody can register as admin. |
| 04 | Register with a short password | new email | The password must be at least 8 characters. |
| 05 | Login with a wrong password | postman01 | One general `401` message. |
| 06 | Login with an unknown email | none | The same `401` as test 05. |
| 07 | Login success | postman01 | Own data only, no tokens in the JSON, two cookies. |
| 08 | `me` while logged in | postman01 | The login cookie works. |
| 09 | Refresh success | postman01 | A refresh token gives new cookies. |
| 10 | Refresh with the old token | postman01 | A used refresh token is refused. All tokens are cancelled. |
| 11 | Logout | postman01 | Logout clears the cookies. |
| 12 | `me` after logout | postman01 | The route is locked again. |
| 13 | Refresh with the cancelled token | postman01 | A cancelled token is refused. |
| 14 | Login as the seed student | student01 | Seed accounts work with the real login code. |
| 15 | `me` with a suspended account | student01 | A suspension works at once. |
| 16 | Login with a suspended account | student01 | The same general `401`. |
| 17 | DBeaver: refresh token hashes | database | Only 64-character hashes are stored. |
| 18 | DBeaver: password hashes | database | Passwords are bcrypt hashes. |
| 19 | Rate limit | postman01 | Six wrong logins in a minute give `429`. |

**Order matters.** Tests 08 to 13 depend on the cookies from earlier tests. Run them one after another, in the same Postman window.

---

## 3. Start of a Fresh Round

Do this first if you want to run all 19 tests again.

1. Wait 60 seconds if you did anything with login or register in the last minute.
2. Run the cleanup in Section 5 (A) in DBeaver, so `postman01` does not exist. Then test 01 gives `201` again.
3. Check that `student01` is active (Section 5, C).
4. Clear the Postman cookies for `localhost` (Cookies, then delete both).

---

## 4. The Tests

### Test 01 — Register success

**What it is for:** shows that a new student can make an account, and that the reply holds only safe fields.

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

**Expected output:**
- Status `201 Created`.
- A `data` key with `id`, `name`, `department`, `academic_year`, `bio` (null), and `role` (`student`).
- No `email`, no `password_hash`, and no token.
- No cookies are set. Register never sets cookies.

**If you run it again:** if `postman01` already exists, you get `409`. Either delete the row first (Section 5, A), or use a new email such as `postman02@studycircle.test` and use that email in the later tests.

---

### Test 02 — Register with a duplicate email

**What it is for:** shows that one email cannot have two accounts.

```text
POST http://localhost:3000/api/v1/auth/register
```

Body: the **same** body as test 01.

**Expected output:**
- Status `409 Conflict`.
- This exact reply:

```json
{
  "status_code": 409,
  "message": "this email is already registered",
  "errors": []
}
```

- No `data` key.

**If you run it again:** run test 01 first, so the account exists.

---

### Test 03 — Register with an extra `role` field

**What it is for:** shows that nobody can make themselves an admin. The register input does not list `role`, so the server refuses it.

```text
POST http://localhost:3000/api/v1/auth/register
```

Body (raw, JSON). The email is new, so the extra field is the only problem:

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

**Expected output:**
- Status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "role",
      "message": "property role should not exist"
    }
  ]
}
```

- No account is created.

**If you run it again:** the email can stay the same, because no account is made.

---

### Test 04 — Register with a short password

**What it is for:** shows that the password must be at least 8 characters.

```text
POST http://localhost:3000/api/v1/auth/register
```

Body (raw, JSON). The password has only 5 characters:

```json
{
  "name": "Postman Three",
  "email": "postman03@studycircle.test",
  "password": "Ab@12",
  "department": "CSE",
  "academic_year": 2
}
```

**Expected output:**
- Status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "password must be longer than or equal to 8 characters"
    }
  ]
}
```

- No account is created.

**Rate limit note:** tests 01 to 04 are four register calls. The limit is 5 per minute. If you get `429`, wait 60 seconds.

---

### Test 05 — Login with a wrong password

**What it is for:** shows that a wrong password gives one general message. The reply never says which part was wrong.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (raw, JSON). The email is real and the password is wrong:

```json
{
  "email": "postman01@studycircle.test",
  "password": "WrongPass@999"
}
```

**Expected output:**
- Status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "email or password is not correct",
  "errors": []
}
```

- No `data` key.
- Open the Cookies tab. No cookie must be set.

**If you run it again:** `postman01` must exist (run test 01 first).

---

### Test 06 — Login with an unknown email

**What it is for:** shows that an email with no account gets exactly the same reply as test 05. A stranger cannot learn which emails have an account.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (raw, JSON):

```json
{
  "email": "nobody99@studycircle.test",
  "password": "WrongPass@999"
}
```

**Expected output:**
- Status `401 Unauthorized`.
- The reply is **exactly the same** as test 05 (`email or password is not correct`).
- No cookies are set.

**If you run it again:** use any email that has no account.

---

### Test 07 — Login success

**What it is for:** shows that login gives the person's own data and sets two HttpOnly cookies. The JSON must not hold any token.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (raw, JSON):

```json
{
  "email": "postman01@studycircle.test",
  "password": "Postman@123"
}
```

**Expected output:**
- Status `200 OK`.

```json
{
  "data": {
    "id": 34,
    "name": "Postman One",
    "department": "CSE",
    "academic_year": 2,
    "bio": null,
    "role": "student",
    "email": "postman01@studycircle.test"
  }
}
```

- The `id` may be different on your database.
- The `email` is allowed here, because it is the person's own account.
- No `password_hash`, no `token_hash`, and no token text.
- **Check the Cookies tab.** You must see `access_token` and `refresh_token`. Both must be marked `HttpOnly`. The paths must be `/` and `/api/v1/auth`.

**If you run it again:** the access cookie lives 15 minutes, so run tests 08 and 09 soon after. Login allows 5 calls per minute (tests 05, 06, and 07 are three of them).

---

### Test 08 — `me` while logged in

**What it is for:** shows that the login cookie opens the locked route.

```text
GET http://localhost:3000/api/v1/auth/me
```

Body: none. (If a body is filled in from an earlier test, clear it. The server ignores it, but the screenshot looks cleaner.)

**Expected output:**
- Status `200 OK`.
- The same `data` object as in test 07 (own data, with `email`).
- No `password_hash` and no token text.

**If you run it again:** if you get `401` with `please log in to continue`, the access cookie expired or was not saved. Run test 07 again, then send `me` straight away in the same Postman window.

---

### Test 09 — Refresh success

**What it is for:** shows that a valid refresh cookie gives two new cookies. A refresh token works **only once** (this is called rotation).

**Before you send it (needed for test 10):**
1. Open the Cookies tab for `localhost`.
2. Copy the **whole** `refresh_token` cookie text into a private note. Call it "OLD refresh cookie". Never paste it anywhere public.

```text
POST http://localhost:3000/api/v1/auth/refresh
```

Body: none.

**Expected output:**
- Status `200 OK`.

```json
{
  "data": null
}
```

- No token text in the JSON.
- In the Cookies tab, the `access_token` and `refresh_token` values are now **different** from before. (Do not show the values.)

**If you run it again:** you must be logged in (run test 07 first). Refresh allows 20 calls per minute.

---

### Test 10 — Refresh with the old (used) token

**What it is for:** shows that a used refresh token cannot be used again. The server also **cancels all refresh tokens of that user**, because a reused token may mean a stolen token.

**Steps:**
1. Open the Cookies tab for `localhost`.
2. Edit the `refresh_token` cookie. Select all the text and paste the "OLD refresh cookie" from test 09.
3. Check that it starts with `refresh_token=`, has `Path=/api/v1/auth`, and has a future `Expires` date. Click **Save**.
4. Send the request.

```text
POST http://localhost:3000/api/v1/auth/refresh
```

Body: none.

**Expected output:**
- Status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "the session is not valid. please log in again",
  "errors": []
}
```

- No `data` key and no token text.

**If you run it again:** you need a **new** OLD cookie. Log in (test 07), copy the refresh cookie, send refresh once (test 09), then put the copied cookie back. A cookie that was already used once cannot be used again.

**After this test:** every refresh token of this user is cancelled. Test 11 starts with a fresh login.

---

### Test 11 — Logout

**What it is for:** shows that logout cancels the refresh token and clears both cookies.

**Step 1, login (no screenshot):**

```text
POST http://localhost:3000/api/v1/auth/login
```

```json
{
  "email": "postman01@studycircle.test",
  "password": "Postman@123"
}
```

Expected: `200` with the person's own data.

**Step 2, before logout (needed for test 13):** open the Cookies tab and copy the whole `refresh_token` cookie text into a private note. Call it "CANCELLED refresh cookie".

**Step 3, logout:**

```text
POST http://localhost:3000/api/v1/auth/logout
```

Body: none.

**Expected output:**
- Status `200 OK`.

```json
{
  "data": null
}
```

- The Cookies tab no longer lists `access_token` and `refresh_token` for `localhost`.

**If you run it again:** login first. Remember to copy the refresh cookie before you logout.

---

### Test 12 — `me` after logout

**What it is for:** shows that the locked route is locked again after logout.

```text
GET http://localhost:3000/api/v1/auth/me
```

Body: none.

**Expected output:**
- Status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "please log in to continue",
  "errors": []
}
```

- No `data` key.

**If you run it again:** run it right after test 11. If you get `200`, the access cookie was not removed. Stop and check the logout code.

---

### Test 13 — Refresh with the cancelled token

**What it is for:** shows that a refresh token cancelled by logout cannot be used.

**Steps:**
1. Open the Cookies tab for `localhost`. Add or edit the `refresh_token` cookie.
2. Paste the "CANCELLED refresh cookie" text from test 11.
3. Check that it starts with `refresh_token=`, has `Path=/api/v1/auth`, and has a future `Expires` date. Click **Save**.
4. Send the request.

```text
POST http://localhost:3000/api/v1/auth/refresh
```

Body: none.

**Expected output:**
- Status `401 Unauthorized`.
- The same reply as test 10 (`the session is not valid. please log in again`).
- No `data` key and no token text.

**If you run it again:** you need a new cookie copied just before a logout (test 11, step 2).

**Tip:** if Postman will not let you add a cookie, send a `Cookie` header on the request instead (the header value is `refresh_token=` followed by the saved value). Delete that header after the test.

---

### Test 14 — Login as the seed student

**What it is for:** shows that the demo accounts made by the seed script work with the real login code.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (raw, JSON):

```json
{
  "email": "student01@studycircle.test",
  "password": "Student@12345"
}
```

**Expected output:**
- Status `200 OK`.

```json
{
  "data": {
    "id": 2,
    "name": "Anika Rahman",
    "department": "Physics",
    "academic_year": 2,
    "bio": null,
    "role": "student",
    "email": "student01@studycircle.test"
  }
}
```

- No `password_hash` and no token text.
- Two new cookies are set. Keep them for test 15.

**If you run it again:** the name and department come from the seed. If the seed changes, these values may change too.

---

### Test 15 — `me` with a suspended account

**What it is for:** shows that a suspension works **at once**. The access token is still valid for 15 minutes, but the guard reads the status from the database on every request.

**Step 1, check that the cookies still work.** Log in again as `student01` (test 14 body) if more than 15 minutes passed. Then send:

```text
GET http://localhost:3000/api/v1/auth/me
```

Expected: `200` with the seed student's own data. (This is your "before" image.)

**Step 2, suspend the account in DBeaver** (connected to `studycircle`). See Section 5, B1:

```sql
UPDATE users SET status = 'suspended' WHERE email = 'student01@studycircle.test';
```

**Step 3, send `me` again** with the same cookies:

```text
GET http://localhost:3000/api/v1/auth/me
```

**Expected output:**
- Status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "please log in to continue",
  "errors": []
}
```

- The message is the same as "not logged in". This is on purpose, so a stranger cannot tell the two cases apart.

**If you run it again:** do **not** restore the account yet. Test 16 needs it suspended.

---

### Test 16 — Login with a suspended account

**What it is for:** shows that a suspended person gets the same general `401` as a wrong password. They do not learn that the account exists.

The account must still be suspended (from test 15).

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (raw, JSON). The password is correct. Only the status is the problem:

```json
{
  "email": "student01@studycircle.test",
  "password": "Student@12345"
}
```

**Expected output:**
- Status `401 Unauthorized`.

```json
{
  "status_code": 401,
  "message": "email or password is not correct",
  "errors": []
}
```

- No `data` key and no cookies set.

**Take the screenshot first. Then restore the account** (Section 5, B2). After the restore, the same login gives `200`.

```sql
UPDATE users SET status = 'active' WHERE email = 'student01@studycircle.test';
```

---

### Test 17 — DBeaver: refresh token hashes

**What it is for:** shows that the database stores only 64-character SHA-256 hashes of refresh tokens, never the real tokens. Cancelled tokens are flagged.

Run in DBeaver, connected to `studycircle` (Section 5, D). The query never selects `token_hash`, so no hash can appear in a screenshot.

**Expected output:**
- `hash_length` is `64` on every row.
- `is_64_hex` is true on every row.
- Tokens that were cancelled (by reuse or logout) show `is_revoked` as true.
- Tokens of an account that never logged out show `is_revoked` as false.

**If you run it again:** the rows depend on which tests you ran. After a fresh round, the `postman01` rows are cancelled and the `student01` rows are still valid.

---

### Test 18 — DBeaver: password hashes

**What it is for:** shows that passwords are stored as bcrypt hashes, never as plain text. It checks an account made by the register route and one made by the seed script.

Run in DBeaver, connected to `studycircle` (Section 5, E).

**Expected output:**
- 2 rows: `student01` and `postman01`.
- `hash_start` is `$2b$` on both.
- `hash_length` is `60` on both.
- `is_bcrypt` is true on both.
- No full `password_hash` is shown.

---

### Test 19 — Rate limit

**What it is for:** shows that too many login attempts in one minute are blocked.

**Steps:**
1. Wait 60 seconds, so earlier login calls do not count.
2. Send the request below 6 times, one after the other, as fast as you can.

```text
POST http://localhost:3000/api/v1/auth/login
```

Body (raw, JSON). Use the same body every time:

```json
{
  "email": "postman01@studycircle.test",
  "password": "WrongPass@999"
}
```

**Expected output:**
- Calls 1 to 5 give `401` (`email or password is not correct`).
- Call 6 gives `429 Too Many Requests`:

```json
{
  "status_code": 429,
  "message": "ThrottlerException: Too Many Requests",
  "errors": []
}
```

- In the reply **Headers** tab, `Retry-After` is `60`.

**Known issue:** the `429` message is a class name and not a plain sentence. It breaks `studycircle_api_shape_v3.md`, Section 3, rule 1. A fix in the exception filter is planned. If it is fixed later, update the message in this test.

**If you run it again:** if you get `429` too early, an earlier call counted. Wait 60 seconds (or restart the backend) and start again. A whole classroom behind one campus address shares one count, so raise the login limit to 10 per minute before a classroom demo.

---

## 5. DBeaver Queries

**Connection:** the `studycircle` database (not `studycircle_test`, not `studycircle_shadow`). DBeaver should show `public@studycircle` in the toolbar and the mode `Auto`.

Run one query at a time. Select the query text and press `Ctrl+Enter`.

### A. Delete the Postman test account (so register works again)

Use this before a fresh round. The refresh tokens of this user are deleted with it, because that foreign key uses `Cascade`.

```sql
DELETE FROM users WHERE email = 'postman01@studycircle.test';
```

Check that it is gone. It should return 0 rows:

```sql
SELECT id, email FROM users WHERE email = 'postman01@studycircle.test';
```

**Notes:**
- Only delete test accounts. Never run a delete without a `WHERE`.
- If the account owns other rows (a group, a message), the delete is refused, because those links use `Restrict`. The Postman account owns nothing, so it works.
- To delete other test emails (`postman02`, `postman03`), change the email in the `WHERE`.

### B. Suspend and restore the seed student

**B1. Suspend (test 15):**

```sql
UPDATE users SET status = 'suspended' WHERE email = 'student01@studycircle.test';
```

**B2. Restore (after test 16). Always do this, because the demo uses the account:**

```sql
UPDATE users SET status = 'active' WHERE email = 'student01@studycircle.test';
```

### C. Check the status of the test accounts

Run this any time. Both accounts should be `active` after the tests.

```sql
SELECT id, email, role, status, deleted_at FROM users WHERE email IN ('postman01@studycircle.test', 'student01@studycircle.test') ORDER BY id;
```

### D. Refresh token hashes (test 17)

This never selects `token_hash`:

```sql
SELECT id, user_id, length(token_hash) AS hash_length, token_hash ~ '^[0-9a-f]{64}$' AS is_64_hex, revoked_at IS NOT NULL AS is_revoked, expires_at, created_at FROM refresh_tokens ORDER BY id DESC LIMIT 10;
```

### E. Password hashes (test 18)

This shows only the start of the hash and its length:

```sql
SELECT id, email, left(password_hash, 4) AS hash_start, length(password_hash) AS hash_length, password_hash LIKE '$2b$%' AS is_bcrypt FROM users WHERE email IN ('postman01@studycircle.test', 'student01@studycircle.test') ORDER BY id;
```

### F. Clear the refresh tokens of one test account (optional reset)

Use this if you want to start the token tests fresh without deleting the account. It removes the token rows only.

```sql
DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = 'postman01@studycircle.test');
```

### G. Count the refresh tokens per user (optional)

Useful to see how many old rows pile up (a known limit in Part 7):

```sql
SELECT user_id, COUNT(*) AS total_tokens, COUNT(*) FILTER (WHERE revoked_at IS NULL) AS still_valid FROM refresh_tokens GROUP BY user_id ORDER BY user_id;
```

---

## 6. If Something Looks Wrong

| What you see | Likely reason | What to do |
|---|---|---|
| `me` gives `401` right after a login | The access cookie expired (15 minutes), or Postman did not save it | Log in again. Then call `me` in the same window. |
| Test 01 gives `409` | The account already exists | Delete it (Section 5, A) or use a new email. |
| Any call gives `429` | The 5 per minute limit | Wait 60 seconds, or restart the backend. |
| Test 10 gives `200` and not `401` | The cookie you pasted was not the OLD one, or it was never used | Redo test 09 and copy the refresh cookie **before** you send refresh. |
| Test 12 gives `200` | Logout did not clear the access cookie | Stop. Check the logout code and the cookie helper. |
| Test 14 gives `401` | The seed was not run, or the seed student is suspended | Run `npm run seed`, or restore the account (Section 5, B2). |
| Test 15 gives `200` after the SQL | The update did not run or hit the wrong email | Run query C and check the `status`. DBeaver must be in `Auto` mode. |
| The backend will not start | `JWT_ACCESS_SECRET` or `FRONTEND_URL` is missing from `backend/.env` | Add them. See Step 36 in `nestjs_setup_v8.md`. |
| An orange or purple bar appears in Postman | A Postman helper, not part of the project | Click **Decline**. |

---

## 7. Notes for Next Time

1. If you add a **new auth route**, add a new test here with the same parts: purpose, request, expected output, and a "run it again" note.
2. If you change a **message text** in the code, update the expected output in every test that shows it.
3. If you change a **limit** (for example login from 5 to 10 per minute), update Section 1.4 and test 19.
4. If you change the **cookie settings** (lifetime, path, flags), update Section 1.5 and tests 07 and 09.
5. When the planned `429` message fix is done, update test 19 and the troubleshooting table.
6. Keep every screenshot free of cookie values, `.env`, and real passwords.
