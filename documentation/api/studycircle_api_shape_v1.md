# StudyCircle — API Shape Rules (v1)

**Written:** 8 November 2026
**Scope:** Every REST route in the backend. This is a living document. If a rule changes, update this file and make a new version number (v2, v3).

> **What this file is:** One rulebook for how every API reply looks from the outside. It has no code. The code in Step 5 and in every feature follows it.
> **If the code and this file disagree:** this file wins. Fix the code, or change this file on purpose.
> **Related files:** `studycircle_database_schema_mvp_v3.md` (tables), `studycircle_fixed_values.md` (fixed words), `studycircle_mvp_3_month_plan.md` (roadmap).

---

## 1. Base Path

Every route starts with `/api/v1`.

Example: `GET /api/v1/groups`

Why: the version in the path lets us add a `v2` later without breaking old clients. The 3-month plan asks for a versioned API.

The prefix is set once, in one place (`main.ts`). Controllers do not repeat it.

---

## 2. Success Replies

Every successful reply is wrapped in `data`. The frontend always reads the same place.

**One item:**

```json
{ "data": { "id": 12, "title": "Beginner Data Structures", "max_size": 8, "exam_date": "2026-12-15" } }
```

**A list** (adds a `meta` block, see Section 4):

```json
{
  "data": [ { "id": 12, "title": "Beginner Data Structures" } ],
  "meta": { "page": 1, "limit": 10, "total": 87, "total_pages": 9 }
}
```

**An action with nothing to send back** (for example logout, delete, leave group): status `200` with

```json
{ "data": null }
```

**Files:** a file download is not JSON. It is sent as an attachment (see the safe upload rules in the 3-month plan, Section 4). Errors on the download route still use the error shape below.

---

## 3. Error Replies

Every error has the same three keys. `errors` is a list. It is filled only for bad form input. For every other error it is an empty list.

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be a valid email" }
  ]
}
```

A non-form error looks like this:

```json
{
  "status_code": 409,
  "message": "You already have a pending request for this group",
  "errors": []
}
```

Rules:
1. `message` is short and written for a person. It is safe to show on screen.
2. **SAFETY:** an error never shows a stack trace, a SQL error, a file path, or the database link. A raw database error (like `23505`) must be turned into a friendly message first.
3. **SAFETY:** the login error never says which part was wrong. Use one message for both a wrong email and a wrong password, for example "Email or password is wrong".

---

## 4. Pagination

**Page style** (used by search, users table, groups table, reports, notifications):

| Item | Rule |
|---|---|
| Query names | `page` and `limit` (for example `?page=2&limit=10`) |
| Default `limit` | **10** |
| Maximum `limit` | **50**. A bigger number is cut down to 50. |
| Smallest `page` | 1. A smaller number becomes 1. |
| `meta` keys | `page`, `limit`, `total`, `total_pages` |

**Cursor style** (used only by chat history, because chat grows fast and new messages keep arriving):

| Item | Rule |
|---|---|
| Query names | `before_id` and `limit` (load messages older than this id) |
| Default `limit` | 30 |
| Maximum `limit` | 50 |
| `meta` keys | `limit`, `next_cursor` |
| End of history | `next_cursor` is `null` |

Never return a full table in one reply.

---

## 5. Naming and Format Rules

| Rule | Choice | Why |
|---|---|---|
| JSON keys | `snake_case` (`max_size`, `exam_date`) | Matches the database, the schema file, the fixed values file, and the notification payload keys. |
| Fixed values (enums) | Exact words from `studycircle_fixed_values.md` (`in_person`, `join_request_approved`) | One spelling everywhere. |
| Dates and times | UTC text, like `2026-11-08T10:00:00Z` | The frontend shows local time. |
| `exam_date` | Plain date, like `2026-12-15` | The schema stores it as a date only. |
| IDs | Whole numbers | Decided in week 1 (integer IDs). |
| Big IDs | `messages.id` and `reports.target_id` (bigint) are sent as **strings**, like `"9007"` | JSON cannot carry a bigint safely. |
| Route names | Plural nouns. Things inside a group sit under the group. | Easy to guess. Example: `/api/v1/groups/12/members`. |
| Actions that are not simple create/read/update/delete | A verb at the end of the route. Example: `POST /api/v1/join-requests/5/approve` | Clear and simple. |
| Route words | lowercase, with a hyphen between words (`join-requests`) | Keeps URLs tidy. |

**How snake_case works with the code:** Prisma and TypeScript use camelCase inside the code (`maxSize`). A small global helper (built once in Step 5) does the change at the edge of the API:
1. Replies are changed from camelCase to snake_case before they are sent.
2. Incoming body and query values are changed from snake_case to camelCase before they reach the code.

No feature code should change key names by hand.

---

## 6. Status Codes

| Code | When to use it |
|---|---|
| `200` | Success (read, update, action) |
| `201` | Something was created (register, create group, send join request) |
| `400` | Bad input (validation failed) |
| `401` | Not logged in, or the login has expired |
| `403` | Logged in, but not allowed (for example a student who is not the leader tries to edit a group, or a suspended account) |
| `404` | Not found. **Also used when a non-member asks for a group's private data** (chat, posts, files, members-only lists). We do not say "it exists but you cannot see it." |
| `409` | Conflict (a duplicate pending join request, the group is full, the person is already a member) |
| `429` | Too many requests (rate limit hit) |
| `500` | Server problem. The message stays generic. |

**Decision (8 November 2026):** non-members get `404`, not `403`, for private group data. This is safer, because it does not confirm that a private group exists. The cost is that it is a little harder to debug. When debugging, check the server log, not the reply.

---

## 7. Fields That Are Never Sent

| Never sent | Why |
|---|---|
| `password_hash` | Never leaves the server. |
| `token_hash` (refresh tokens) | Never leaves the server. |
| Another person's `email` | Emails are never shown to other users. |
| `user_id` and the writer's name on a **review**, when the reader is the leader or the admin | The leader must not see who wrote a review (decided in week 1). |
| `stored_name` of a file | The random server name stays private. Downloads go through the membership check route. |
| `deleted_at` rows | Soft-deleted rows are filtered out and never shown. |

**How to enforce it:** every route sends its reply through a response shape (a DTO or serializer) that lists only the safe fields. Never send a raw Prisma object.

---

## 8. Who Can Call What (Reminder)

The shape of the reply does not decide access. The server checks every request.

1. Public routes: register, login, refresh.
2. Student routes: need a valid login.
3. Leader routes: need a valid login **and** to be the active leader of that group (checked in the service, not only in a guard).
4. Admin routes: need a valid login **and** the `admin` role.
5. Group space routes (chat, posts, files, members list): need an **active** member of that group. A removed member loses access at once.

---

## 9. How This Is Enforced in Code (Step 5)

| Piece | Job |
|---|---|
| Global prefix `api/v1` | Sets the base path in `main.ts`. |
| Response interceptor | Wraps every success reply in `data` and adds `meta` for lists. |
| Exception filter | Turns every error into the error shape in Section 3. |
| snake_case helper | Converts keys in and out (Section 5). |
| Pagination helper | Reads `page` and `limit`, applies the default and maximum, and builds `meta`. |
| `ValidationPipe` | Checks every input with class-validator, and feeds the `errors` list. |

---

## 10. Change Log

| Version | Date | Change |
|---|---|---|
| v1 | 8 November 2026 | First version. Base path `/api/v1`, snake_case keys, default `limit` 10, maximum 50, `404` for non-members. |
