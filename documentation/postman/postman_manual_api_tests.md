# StudyCircle — Postman Manual API Tests

**Tests done up to:** test 48, on 22 November 2026.
**Next test number:** 49.

## 1. What This File Is

This is one living file. It does two jobs.

1. **A guide to repeat the tests.** Every test has a number, what it is for, the method and URL, the JSON body, the manual steps, the expected reply, and the cleanup SQL. Use it when you want to run a test again.
2. **A record of the tests.** The log in Section 6 shows which tests were done and on which day. When more tests are done, add them to the log and keep counting. Do not start again from 01.

The file has no version number. It changes only by adding tests and dates.

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

After each test, the person takes a screenshot and saves it in `screenshots/postman_manual_api_testing/`. This file never lists screenshot names or commit messages. It refers to each test only by its number.

**Check every screenshot before it is saved:**
1. No cookie token values, no `.env` content, no real password.
2. The Postman helper bars ("Fix 401", "Add tests", "Change method") are closed. Click **Decline**.
3. The status code and the reply are both visible.

**After the test:** the chat adds the test to Section 6 (log) and Section 7 (details), and updates the two lines at the top of this file ("Tests done up to" and "Next test number").

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
| Second seed student | `student02@studycircle.test`, id `3` | Made by the seed script. Password `Student@12345`. Name "Rafi Sarker" (checked on 20 November 2026). Used as "another person" in tests 24, 25, 34, 35, and 37. |
| Demo group | id `26`, "Trees and graphs exam prep" | Made by test 30 on 22 November 2026, with Anika Rahman (id 2) as leader. Edited by test 36. A new run of test 30 makes a group with a new id. |
| Seed admin | `admin@studycircle.test` | Password is `SEED_ADMIN_PASSWORD` from `backend/.env`. Never write it here. |
| Unknown email | `nobody99@studycircle.test` | Has no account. Used in test 06. |
| Wrong password | `WrongPass@999` | A throwaway value for the wrong-password tests. |

All passwords above except the admin one are throwaway demo values. They are safe to show in an image.

**Ids change.** The `postman01` account had id 32, and then id 34, because ids are never reused after a delete. Do not expect a fixed id in the reply. Check that the field exists and that the other fields look right.

**What the replies look like (checked on 17 November 2026):**

| Reply | Shape |
|---|---|
| Register success (`201`) | `data` with `id`, `name`, `department`, `academic_year`, `bio`, `role`. No email, no hash. |
| Login success and `me` (`200`) | `data` with the same fields, plus the person's own `email`. No token text. |
| Action with nothing to return (`200`) | `{ "data": null }` |
| Own profile (`200`) | `data` with `id`, `name`, `department`, `academic_year`, `bio`, `subjects` (a list of `id` and `name`), the person's own `email`, and `role`. Checked on 20 November 2026. |
| Public profile (`200`) | `data` with `id`, `name`, `department`, `academic_year`, `bio`, `subjects`. No email, no role. Checked on 20 November 2026. |
| Group page (`200` or `201`) | `data` with `id`, `title`, `topic`, `description`, `exam_date` (`YYYY-MM-DD` or null), `mode`, `location`, `max_size`, `member_count`, `seats_left`, `status`, `members_can_post`, `created_at`, `subject` and `leader` (each `id` and `name`), `level` (`id` and `name`, or null), and `my_role` (`leader`, `member`, or null). No emails. Checked on 22 November 2026. |
| Group search (`200`) | `data` is a list of group cards, and `meta` has `page`, `limit`, `total`, `total_pages`. Each card has `id`, `title`, `topic`, `exam_date` (`YYYY-MM-DD` or null), `mode`, `location`, `max_size`, `member_count`, `seats_left`, `created_at`, `subject` and `leader` (each `id` and `name`), and `level` (`id` and `name`, or null). No `description`, no `status`, no `my_role`, no emails. Checked on 22 November 2026. |
| Any error | `status_code`, `message`, `errors` (a list, empty unless it is a form error) |

## 6. Test Log

| # | Test | Result | Date done |
|---|---|---|---|
| 01 | Register success | `201`, safe fields only | 17 November 2026 |
| 02 | Register with a duplicate email | `409` | 17 November 2026 |
| 03 | Register with an extra `role` field | `400` | 17 November 2026 |
| 04 | Register with a short password | `400` | 17 November 2026 |
| 05 | Login with a wrong password | `401` | 17 November 2026 |
| 06 | Login with an unknown email | `401`, same message as 05 | 17 November 2026 |
| 07 | Login success | `200`, own data, two cookies | 17 November 2026 |
| 08 | `me` while logged in | `200` | 17 November 2026 |
| 09 | Refresh success | `200`, `{ "data": null }` | 17 November 2026 |
| 10 | Refresh with an old (used) token | `401` | 17 November 2026 |
| 11 | Logout | `200`, `{ "data": null }` | 17 November 2026 |
| 12 | `me` after logout | `401` | 17 November 2026 |
| 13 | Refresh with a cancelled token | `401` | 17 November 2026 |
| 14 | Login as the seed student | `200` | 17 November 2026 |
| 15 | `me` with a suspended account | `401` at once | 17 November 2026 |
| 16 | Login with a suspended account | `401`, same message as 05 | 17 November 2026 |
| 17 | DBeaver: refresh token hashes | 64 hex characters, cancelled rows flagged | 17 November 2026 |
| 18 | DBeaver: password hashes | bcrypt, `$2b$`, length 60 | 17 November 2026 |
| 19 | Login rate limit | `429`, `Retry-After: 60` | 17 November 2026 |
| 20 | Own profile | `200`, own email and subjects | 20 November 2026 |
| 21 | Edit own profile | `200`, bio saved without outer spaces | 20 November 2026 |
| 22 | Edit with an extra `role` field | `400`, nothing saved | 20 November 2026 |
| 23 | Edit with a bad `academic_year` | `400`, the field is named | 20 November 2026 |
| 24 | Public profile of another student | `200`, no email, no role | 20 November 2026 |
| 25 | Public profile of a suspended student | `404` | 20 November 2026 |
| 26 | Add a subject | `201` | 20 November 2026 |
| 27 | Add the same subject again | `409` | 20 November 2026 |
| 28 | Remove a subject | `200`, `{ "data": null }` | 20 November 2026 |
| 29 | Own profile without a login | `401` | 20 November 2026 |
| 30 | Create a group | `201`, `my_role: "leader"`, `seats_left: 4` | 22 November 2026 |
| 31 | Create an in-person group with no location | `400` | 22 November 2026 |
| 32 | Create a group with a past exam date | `400` | 22 November 2026 |
| 33 | Create a group with an extra `leader_id` field | `400`, the field is named | 22 November 2026 |
| 34 | Another student views the group | `200`, `my_role: null`, no email | 22 November 2026 |
| 35 | View an unknown group | `404` | 22 November 2026 |
| 36 | The leader edits the group | `200`, title trimmed, `seats_left: 7` | 22 November 2026 |
| 37 | A student who is not the leader edits the group | `403`, nothing changed | 22 November 2026 |
| 38 | Edit with an empty body | `400` | 22 November 2026 |
| 39 | DBeaver: the group and its one leader row | 1 row, `role = leader` | 22 November 2026 |
| 40 | Search groups with no filters | `200`, 10 cards, newest first, `total` 13 | 22 November 2026 |
| 41 | Search groups, page 2 | `200`, the last 3 cards, `page` 2 | 22 November 2026 |
| 42 | Search groups by subject | `200`, 3 Algorithms cards | 22 November 2026 |
| 43 | Search groups by nearest exam first | `200`, nearest exam first, no exam date last | 22 November 2026 |
| 44 | Search with no matching group | `200`, empty `data`, `total` 0 | 22 November 2026 |
| 45 | Search with an exam range that ends before it starts | `400` | 22 November 2026 |
| 46 | Search with a bad subject id | `400`, the field is named | 22 November 2026 |
| 47 | Search with an unknown query key | `400`, the key is named | 22 November 2026 |
| 48 | Search without a login | `401` | 22 November 2026 |

**Rounds:**

| Round | Date | Tests | Notes |
|---|---|---|---|
| 1 | 17 November 2026 | 01 to 19 | Backend authentication (register, login, me, refresh, logout, suspension, rate limit). All passed. The images of that day show the messages of that time: lowercase auth messages and the `429` text `ThrottlerException: Too Many Requests`. Both were changed on 19 November 2026 (Section 7 shows the new text). |
| 2 | 20 November 2026 | 20 to 29 | Profile routes (own profile, edit, refused fields, public profile, suspended profile, subjects of interest, no login). All passed. Demo data was put back afterwards and checked in DBeaver. |
| 3 | 22 November 2026 | 30 to 39 | Group routes (create, the location and past-date rules, a refused extra field, view by another student, unknown id, leader edit, edit by a non-leader, empty edit, the leader row in DBeaver). All passed. The tests were run in the order 30 to 35, then 37, then 36, 38, and 39, to save one login. Group 26 stays in the development database as demo data. The `409` size case needs more members, so it is covered only by the e2e tests until join requests exist (week 5). |
| 4 | 22 November 2026 | 40 to 48 | Group search (no filters, page 2, subject filter, nearest exam sort, no match, bad exam range, bad subject id, unknown key, no login). All passed. Nothing was changed in the database. Test 48 ends with a logout. |

## 7. Test Details

The tests of round 1 depend on each other. Run them in order the first time. After that, each test says what it needs. The tests of round 2 (20 to 29) also run in order, because tests 27 and 28 use the subject added in test 26. The tests of round 3 (30 to 39) use the group made in test 30. Run 34, 35, and 37 while logged in as the second seed student, then log back in as `student01` for 36, 38, and 39. The tests of round 4 (40 to 48) only read data. Run 40 to 47 logged in as `student01`. Test 48 logs out first.

**Search results change with time.** Search hides a group once its exam date has passed. The expected lists in tests 40 to 43 were right on 22 November 2026. After 24 November, group 2 drops out, after 26 November group 8, and so on. Check the rules (order, no past exam, the `meta` numbers that fit the list), not the exact ids.

**Message wording.** On 19 November 2026 every auth message got a capital first letter, and the `429` message became a plain sentence. The expected replies below show the new text. Images 01 to 19 were saved on 17 November 2026, so they show the old lowercase text. They still prove the same behaviour.

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

**Restore the second seed student** (always do this right after the image of test 25):

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

**Safety:** the cookie values are real tokens. Do not capture the values in an image. Show only the JSON reply.

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

**Cleanup (after the image):** restore the account in DBeaver. If you restore it before the image, the login would succeed with `200`.

```sql
UPDATE users SET status = 'active' WHERE email = 'student01@studycircle.test';
```

---

### Test 17 — DBeaver: refresh token hashes

**What it is for:** shows that only 64-character hashes of refresh tokens are stored, never the raw cookie value, and that cancelled tokens are flagged.

**Run in DBeaver** (`studycircle`). The query never selects `token_hash`, so no hash can show in the image:

```sql
SELECT id, user_id, length(token_hash) AS hash_length, token_hash ~ '^[0-9a-f]{64}$' AS is_64_hex, revoked_at IS NOT NULL AS is_revoked, expires_at, created_at FROM refresh_tokens ORDER BY id DESC LIMIT 10;
```

**Expected:**
1. `hash_length` is `64` and `is_64_hex` is true on every row.
2. Rows for the `postman01` account (cancelled by the reuse in test 10, the logout in test 11, and the reuse in test 13) show `is_revoked` as true.
3. The newest rows of `student01` show `is_revoked` as false, because they were never logged out.

---

### Test 18 — DBeaver: password hashes

**What it is for:** shows that passwords are stored as bcrypt hashes, both for an account made by the register code and for an account made by the seed script.

**Run in DBeaver** (`studycircle`). The query shows only the start of the hash:

```sql
SELECT id, email, left(password_hash, 4) AS hash_start, length(password_hash) AS hash_length, password_hash LIKE '$2b$%' AS is_bcrypt FROM users WHERE email IN ('postman01@studycircle.test', 'student01@studycircle.test') ORDER BY id;
```

**Expected:** 2 rows. `hash_start` is `$2b$`, `hash_length` is `60`, and `is_bcrypt` is true on both rows. No full hash is shown.

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

**Message change (19 November 2026):** the message used to be the class name `ThrottlerException: Too Many Requests`. Since then, the exception filter sends the plain sentence shown above. Image 19 was saved before the change, so it still shows the old text.

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

**Cleanup (right after the image):** restore the second seed student with the SQL above, then send the test 24 request again. It must give `200`.

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

---

### Test 30 — Create a group

**What it is for:** shows that a student can create a study group and becomes its leader at once. The reply is the group page, with seats left worked out and no emails.

**Before:** log in as `student01` with the body of test 14, in the same Postman window. Send `GET http://localhost:3000/api/v1/subjects` and `GET http://localhost:3000/api/v1/levels`, and pick one active id from each. On 22 November 2026 subject `2` ("Algorithms") and level `2` ("Intermediate") were used.

```text
POST http://localhost:3000/api/v1/groups
```

Body (raw, JSON). Use an exam date in the future:

```json
{
  "title": "Data Structures exam prep",
  "subject_id": 2,
  "level_id": 2,
  "description": "Weekly practice with past papers.",
  "exam_date": "2026-12-20",
  "mode": "online",
  "max_size": 5
}
```

**Expected:** status `201 Created`. On 22 November 2026 the reply was:

```json
{
  "data": {
    "id": 26,
    "title": "Data Structures exam prep",
    "topic": null,
    "description": "Weekly practice with past papers.",
    "exam_date": "2026-12-20",
    "mode": "online",
    "location": null,
    "max_size": 5,
    "member_count": 1,
    "seats_left": 4,
    "status": "active",
    "members_can_post": false,
    "created_at": "2026-11-21T19:56:21.926Z",
    "subject": { "id": 2, "name": "Algorithms" },
    "level": { "id": 2, "name": "Intermediate" },
    "leader": { "id": 2, "name": "Anika Rahman" },
    "my_role": "leader"
  }
}
```

`created_at` is in UTC. 19:56 UTC on 21 November is 01:56 on 22 November in Dhaka. The leader has no email. **Write down the group `id`.** Tests 34 to 39 use it.

---

### Test 31 — Create an in-person group with no location

**What it is for:** shows that an in-person group must say where it meets.

**Before:** logged in as `student01`.

```text
POST http://localhost:3000/api/v1/groups
```

Body (raw, JSON):

```json
{
  "title": "Calculus study circle",
  "subject_id": 2,
  "description": "We meet on campus to solve problems together.",
  "mode": "in_person",
  "max_size": 4
}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "An in-person group needs a location",
  "errors": []
}
```

No group is created, because the check runs before anything is saved.

---

### Test 32 — Create a group with a past exam date

**What it is for:** shows that a new group cannot have an exam date that has already passed, because search would hide it at once.

**Before:** logged in as `student01`.

```text
POST http://localhost:3000/api/v1/groups
```

Body (raw, JSON):

```json
{
  "title": "Old exam revision",
  "subject_id": 2,
  "description": "Revision for an exam that already happened.",
  "exam_date": "2025-06-01",
  "mode": "online",
  "max_size": 4
}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "The exam date cannot be in the past",
  "errors": []
}
```

---

### Test 33 — Create a group with an extra `leader_id` field

**What it is for:** shows that nobody can choose the leader by hand. The leader is always the logged-in person.

**Before:** logged in as `student01`.

```text
POST http://localhost:3000/api/v1/groups
```

Body (raw, JSON):

```json
{
  "title": "Sneaky group",
  "subject_id": 2,
  "description": "Trying to choose the leader by hand.",
  "mode": "online",
  "max_size": 4,
  "leader_id": 1
}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "leader_id", "message": "property leader_id should not exist" }
  ]
}
```

No group is created.

---

### Test 34 — Another student views the group

**What it is for:** shows what a student sees before asking to join: the group page with no role and no email.

**Before:** log in as the second seed student. A new login replaces the cookie, so Postman becomes this student:

```text
POST http://localhost:3000/api/v1/auth/login
```

```json
{ "email": "student02@studycircle.test", "password": "Student@12345" }
```

Expect `200` with the name "Rafi Sarker".

```text
GET http://localhost:3000/api/v1/groups/26
```

Body: none. (Use the id from test 30.)

**Expected:** status `200 OK`. The same group page as test 30, with `"my_role": null`, `"seats_left": 4`, and `"leader": { "id": 2, "name": "Anika Rahman" }`. No email anywhere.

---

### Test 35 — View an unknown group

**What it is for:** shows that an unknown group id gives a clean `404`. A removed, deleted, or archived group gives the same reply.

**Before:** logged in as the second seed student (test 34).

```text
GET http://localhost:3000/api/v1/groups/99999
```

Body: none.

**Expected:** status `404 Not Found`.

```json
{
  "status_code": 404,
  "message": "This group does not exist",
  "errors": []
}
```

---

### Test 36 — The leader edits the group

**What it is for:** shows that the leader can change the group, that outer spaces are removed, and that seats left follows the new size.

**Before:** log back in as `student01` with the body of test 14. Expect `200` with the name "Anika Rahman".

```text
PATCH http://localhost:3000/api/v1/groups/26
```

Body (raw, JSON). The spaces around the title are there on purpose:

```json
{ "title": "  Trees and graphs exam prep  ", "max_size": 8 }
```

**Expected:** status `200 OK`. The full group page, with `"title": "Trees and graphs exam prep"` (no spaces at the ends), `"max_size": 8`, `"seats_left": 7`, and `"my_role": "leader"`. Every other field is unchanged.

---

### Test 37 — A student who is not the leader edits the group

**What it is for:** shows that only the leader can change a group. Another student can see it, but gets `403` when they try to change it.

**Before:** logged in as the second seed student (run this right after test 35, before logging back in as `student01`).

```text
PATCH http://localhost:3000/api/v1/groups/26
```

Body (raw, JSON):

```json
{ "title": "Taken over by Rafi" }
```

**Expected:** status `403 Forbidden`.

```json
{
  "status_code": 403,
  "message": "Only the group leader can do this",
  "errors": []
}
```

The title does not change.

---

### Test 38 — Edit with an empty body

**What it is for:** shows that an empty change is refused with a plain sentence, because it is most likely a form mistake.

**Before:** logged in as `student01` (test 36).

```text
PATCH http://localhost:3000/api/v1/groups/26
```

Body (raw, JSON):

```json
{}
```

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Send at least one field to change",
  "errors": []
}
```

---

### Test 39 — DBeaver: the group and its one leader row

**What it is for:** shows that the group row and the leader's member row were saved together, and that the group has exactly one member, the leader.

**Run in DBeaver** (`studycircle`). The query shows no emails:

```sql
SELECT g.id AS group_id, g.title, g.leader_id, g.max_size, g.status AS group_status,
       gm.user_id, gm.role, gm.status AS member_status, gm.joined_at
FROM groups g
JOIN group_members gm ON gm.group_id = g.id
WHERE g.id = 26;
```

**Expected:** exactly 1 row: `group_id` 26, `title` "Trees and graphs exam prep", `leader_id` 2, `max_size` 8, `group_status` `active`, `user_id` 2, `role` `leader`, `member_status` `active`.

**Manual step:** widen the columns before saving the image, so the full title and the column names show.

**Note:** DBeaver may show `joined_at` as `19:56:21 +06`. That is a display quirk. The stored time is right: 19:56 UTC, which is 01:56 in Dhaka, the same moment as `created_at` in test 30.

**Cleanup:** none. Group 26 stays as demo data. `npm run seed` removes it, because the seed wipes the development database.

---

### Test 40 — Search groups with no filters

**What it is for:** shows that a logged-in student gets the first page of open groups as small cards, with a `meta` block for paging. A card has no description, no status, and no email.

**Before:** log in as `student01` with the body of test 14, in the same Postman window. Expect `200` with the name "Anika Rahman".

```text
GET http://localhost:3000/api/v1/groups
```

Body: none.

**Expected:** status `200 OK`. On 22 November 2026:
1. `data` has 10 cards, newest first by `created_at`. The first card is group 26, "Trees and graphs exam prep", with `seats_left` 7.
2. No card has `description`, `status`, `is_flagged`, or any `email`.
3. No card has an `exam_date` before today.
4. Full groups still show, with `seats_left` 0 (groups 2 and 8).
5. `meta` is `{ "page": 1, "limit": 10, "total": 13, "total_pages": 2 }`.

---

### Test 41 — Search groups, page 2

**What it is for:** shows that paging works. Page 2 holds the rest of the groups, and `meta` says which page it is.

**Before:** logged in as `student01` (test 40).

```text
GET http://localhost:3000/api/v1/groups?page=2
```

Body: none.

**Expected:** status `200 OK`. On 22 November 2026, `data` had exactly 3 cards: groups 12, 4, and 15. None of them is on page 1, and all are older than the last card of page 1. `meta` is `{ "page": 2, "limit": 10, "total": 13, "total_pages": 2 }`.

---

### Test 42 — Search groups by subject

**What it is for:** shows that the subject filter works, and that `subject_id=2`, which arrives as text in the address, is turned into a number and accepted.

**Before:** logged in as `student01`.

```text
GET http://localhost:3000/api/v1/groups?subject_id=2
```

Body: none.

**Expected:** status `200 OK`. On 22 November 2026, `data` had exactly 3 cards, newest first: groups 26, 14, and 2. Every card has `"subject": { "id": 2, "name": "Algorithms" }`. `meta` is `{ "page": 1, "limit": 10, "total": 3, "total_pages": 1 }`.

**Tip:** the address box holds only the address. If `GET` is pasted into it too, Postman shows "Invalid protocol" and sends nothing.

---

### Test 43 — Search groups by nearest exam first

**What it is for:** shows the "exam soonest" sort. The nearest exam comes first. Groups with no exam date go to the end. `limit=20` puts every group on one page, so the end of the list can be checked.

**Before:** logged in as `student01`.

```text
GET http://localhost:3000/api/v1/groups?sort=exam_soonest&limit=20
```

Body: none.

**Expected:** status `200 OK`. On 22 November 2026 the order was:

| # | Group id | `exam_date` |
|---|---|---|
| 1 | 2 | 2026-11-24 |
| 2 | 8 | 2026-11-26 |
| 3 | 14 | 2026-11-29 |
| 4 | 3 | 2026-12-01 |
| 5 | 12 | 2026-12-03 |
| 6 | 6 | 2026-12-07 |
| 7 | 18 | 2026-12-10 |
| 8 | 9 | 2026-12-13 |
| 9 | 26 | 2026-12-20 |
| 10 | 15 | 2026-12-22 |
| 11 | 4 | null |
| 12 | 10 | null |
| 13 | 16 | null |

Groups with the same exam date (or no date) come with the smallest id first. `meta` is `{ "page": 1, "limit": 20, "total": 13, "total_pages": 1 }`.

---

### Test 44 — Search with no matching group

**What it is for:** shows that a search that finds nothing gives a normal `200` with an empty list, not an error. The frontend shows the "Create your own group" button in this case.

**Before:** logged in as `student01`.

```text
GET http://localhost:3000/api/v1/groups?q=quantum
```

Body: none. (No seed group has "quantum" in its title or topic.)

**Expected:** status `200 OK`.

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 0, "total_pages": 0 }
}
```

No `status_code`, `message`, or `errors` keys.

---

### Test 45 — Search with an exam range that ends before it starts

**What it is for:** shows that an exam range that could never match (the first day after the last day) is refused with a plain sentence.

**Before:** logged in as `student01`.

```text
GET http://localhost:3000/api/v1/groups?exam_from=2026-12-20&exam_to=2026-12-01
```

Body: none.

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "The first exam day cannot be after the last exam day",
  "errors": []
}
```

---

### Test 46 — Search with a bad subject id

**What it is for:** shows that a filter value that can never be an id is refused, and that the error names the field in snake_case.

**Before:** logged in as `student01`.

```text
GET http://localhost:3000/api/v1/groups?subject_id=abc
```

Body: none.

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "subject_id", "message": "subject_id must not be greater than 2147483647" },
    { "field": "subject_id", "message": "subject_id must not be less than 1" },
    { "field": "subject_id", "message": "subject_id must be an integer number" }
  ]
}
```

The three messages may come in a different order. Every `field` is `subject_id`, never `subjectId`.

---

### Test 47 — Search with an unknown query key

**What it is for:** shows that the search refuses any key it does not list, so nobody can add a key like `status` to see closed or removed groups.

**Before:** logged in as `student01`.

```text
GET http://localhost:3000/api/v1/groups?status=removed
```

Body: none.

**Expected:** status `400 Bad Request`.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "status", "message": "property status should not exist" }
  ]
}
```

---

### Test 48 — Search without a login

**What it is for:** shows that the search is locked. Only logged-in students can see the groups.

**Before:** log out: `POST http://localhost:3000/api/v1/auth/logout`, body none. Expect `200` with `{ "data": null }`.

```text
GET http://localhost:3000/api/v1/groups
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

No `data` key.

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
````

After the test is added here, also add one row to the log in Section 6, and update the two lines at the top of this file.
