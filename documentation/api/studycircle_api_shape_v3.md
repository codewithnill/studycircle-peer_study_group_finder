# StudyCircle — API Shape Rules (v3)

**Written:** 8 November 2026 (v1)
**Revised:** 12 November 2026 (v3). The Step 5 code was run and checked. No rule was changed. This version updates the status line and adds a note about the address `/`. Earlier revision on 11 November 2026 (v2): the shared code from Step 5 was written, and the small decisions made while writing it were added. No v1 rule was reversed. Some rules were made more exact.
**Scope:** Every REST route in the backend. This is a living document. If a rule changes, update this file and make a new version number (v3, v4).

> **What this file is:** One rulebook for how every API reply looks from the outside. It has no code. The code in Step 5 and in every feature follows it.
> **If the code and this file disagree:** this file wins. Fix the code, or change this file on purpose.
> **Related files:** `studycircle_database_schema_mvp_v3.md` (tables), `studycircle_fixed_values.md` (fixed words), `studycircle_mvp_3_month_plan.md` (roadmap), `nestjs_setup_v4.md` (how the shared code is set up).
> **Status (12 November 2026):** The code that follows these rules is written and checked. The build passes, 38 unit tests pass, and the server starts. The prefix, the success wrapper, and the error shape were checked on the running server. Rules that need a real route (key conversion, unknown fields, list routes, database error codes, big ids) are not tested yet. They are tested when the first routes exist. If a test shows that a rule here does not work, fix the code, or change this file on purpose and make v4.

---

## 1. Base Path

Every route starts with `/api/v1`.

Example: `GET /api/v1/groups`

Why: the version in the path lets us add a `v2` later without breaking old clients. The 3-month plan asks for a versioned API.

The prefix is set once, in one place (`main.ts`). Controllers do not repeat it.

> **Note:** only addresses that start with `/api/v1` use the reply shapes in this file. A request to `/` never reaches the Nest router, so Express answers it with its own plain "Cannot GET /" page. This is harmless, because the frontend never calls `/`.

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

**Files:** a file download is not JSON. It is sent as an attachment (see the safe upload rules in the 3-month plan, Section 4). It is not wrapped in `data`. Errors on the download route still use the error shape below.

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
4. **Field names in `errors`** are written in snake_case, the same as the client sent them. A field inside another object is joined with a dot, for example `address.street_name`. The words inside `message` use the same snake_case name.
5. **Unknown fields:** a request body or query that has a field the route does not list is refused with `400`. This stops someone from sneaking in a field like `role`. Example:

```json
{
  "status_code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "role", "message": "property role should not exist" }
  ]
}
```

6. **Broken JSON** in the request body gives `400` with the message "The request could not be understood".
7. **Server problems:** every `5xx` reply says "Something went wrong on our side". The real details go only to the server log, never to the client.
8. **Known database errors** are turned into friendly replies by default:

| Database code | Status | Message |
|---|---|---|
| `P2002` (a unique rule was broken) | `409` | This value is already in use |
| `P2003` (a foreign key rule was broken) | `409` | This item is still linked to other data |
| `P2025` (the row does not exist) | `404` | Not found |
| `P2034` (two transactions collided) | `409` | The server was busy. Please try again |
| Any other code | `500` | Something went wrong on our side |

A service should still catch the cases it knows well (for example a second pending join request) and give an exact message, like the 409 example above. The table above is only the safety net.

---

## 4. Pagination

**Page style** (used by search, users table, groups table, reports, notifications):

| Item | Rule |
|---|---|
| Query names | `page` and `limit` (for example `?page=2&limit=10`) |
| Default `limit` | **10** |
| Maximum `limit` | **50**. A bigger number is cut down to 50. |
| Smallest `page` | 1. A smaller number becomes 1. |
| Biggest `page` | 1,000,000. A bigger number is cut down. This stops a silly number from causing a server error. |
| Bad input | A `limit` below 1 or not a number uses the default (10). A `page` that is not a number uses 1. A repeated value (`?page=1&page=2`) counts as "not a number". |
| Past the last page | The reply has an empty `data` list and the same `meta`. It is not an error. |
| `meta` keys | `page`, `limit`, `total`, `total_pages` |

How the DTO treats them: a list route lists `page` and `limit` in its DTO with `@IsOptional()` only, and no number rule. The pagination helper cleans the values. This is needed because unknown fields are refused (Section 3, rule 5), and because a bad number must be fixed, not refused. A shared `PaginationQueryDto` will be built with the first list route.

**Cursor style** (used only by chat history, because chat grows fast and new messages keep arriving):

| Item | Rule |
|---|---|
| Query names | `before_id` and `limit` (load messages older than this id) |
| Default `limit` | 30 |
| Maximum `limit` | 50 |
| `meta` keys | `limit`, `next_cursor` |
| `next_cursor` | A **string** (a message id, which is a bigint), like `"9007"` |
| End of history | `next_cursor` is `null` |

The cursor helper is built with chat in week 6. It is not part of Step 5.

Never return a full table in one reply.

---

## 5. Naming and Format Rules

| Rule | Choice | Why |
|---|---|---|
| JSON keys | `snake_case` (`max_size`, `exam_date`) | Matches the database, the schema file, the fixed values file, and the notification payload keys. |
| Fixed values (enums) | Exact words from `studycircle_fixed_values.md` (`in_person`, `join_request_approved`) | One spelling everywhere. |
| Dates and times | UTC text with milliseconds, like `2026-11-08T10:00:00.000Z` | The frontend shows local time. JavaScript always writes the milliseconds. |
| `exam_date` | Plain date, like `2026-12-15` | The schema stores it as a date only. The global helper cannot tell a date-only field from a date-and-time field, so **each reply shape** (the DTO or serializer of a group) formats `exam_date` as a plain date. |
| IDs | Whole numbers | Decided in week 1 (integer IDs). |
| Big IDs | `messages.id`, `reports.target_id`, `admin_actions.target_id` (all bigint) and the chat `next_cursor` are sent as **strings**, like `"9007"` | JSON cannot carry a bigint safely. The response interceptor does this. Feature code does not. |
| Route names | Plural nouns. Things inside a group sit under the group. | Easy to guess. Example: `/api/v1/groups/12/members`. |
| Actions that are not simple create/read/update/delete | A verb at the end of the route. Example: `POST /api/v1/join-requests/5/approve` | Clear and simple. |
| Route words | lowercase, with a hyphen between words (`join-requests`) | Keeps URLs tidy. |

**How snake_case works with the code:** Prisma and TypeScript use camelCase inside the code (`maxSize`). Small global helpers (built once in Step 5) do the change at the edge of the API:
1. Replies are changed from camelCase to snake_case by the response interceptor, before they are sent.
2. Incoming body and query values are changed from snake_case to camelCase by a global pipe, before the validation pipe runs. Route parameters (like the `12` in `/groups/12`) are not changed.
3. Dates, file bytes, and streams are never touched. Only key names change, never values.
4. **SAFETY:** keys named `__proto__`, `constructor`, or `prototype` are dropped from incoming data. This stops an attack called prototype pollution.
5. **Rule for controllers:** always take the whole body or query as one DTO object, like `@Body() dto` and `@Query() dto`. Never pick one key by name, like `@Query('max_size')`. This way the key change and the validation always run on the whole object.

No feature code should change key names by hand.

---

## 6. Status Codes

| Code | When to use it |
|---|---|
| `200` | Success (read, update, action) |
| `201` | Something was created (register, create group, send join request) |
| `400` | Bad input (validation failed, a field the route does not list, or broken JSON) |
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

| Piece | Job | Where |
|---|---|---|
| Global prefix `api/v1` | Sets the base path. | `src/main.ts` (only here) |
| Snake-to-camel pipe | Changes incoming body and query keys to camelCase. It runs **before** the validation pipe. | `src/common/pipes/snake-to-camel.pipe.ts` |
| Validation pipe | Checks every input with class-validator. Removes unknown fields and refuses them with `400`. Builds the `errors` list with snake_case names. | `src/common/pipes/validation-pipe.factory.ts` |
| Response interceptor | Wraps every success reply in `data`, adds `meta` for lists, turns bigint into strings, turns dates into UTC text, changes keys to snake_case, and skips file downloads. | `src/common/interceptors/response.interceptor.ts` |
| Exception filter | Turns every error into the error shape in Section 3. Hides real details of server problems. | `src/common/filters/all-exceptions.filter.ts` |
| Case converter | The helper that changes key spelling in both directions. | `src/common/utils/case-converter.ts` |
| Pagination helper | Reads `page` and `limit`, applies the default and maximum, and builds `meta`. | `src/common/pagination/pagination.ts` |
| Fixed-word constants | The fixed `varchar` lists from `studycircle_fixed_values.md`, Part B. | `src/common/constants/` |

**Open items to confirm after testing:**
1. Prisma error codes with the PostgreSQL adapter. Break each of the two partial indexes with a real request and check which code comes back. The table in Section 3, rule 8 is the expected result.
2. The shared `PaginationQueryDto` is not built yet (Section 4).
3. The cursor helper for chat is not built yet (week 6).

---

## 10. Change Log

| Version | Date | Change |
|---|---|---|
| v1 | 8 November 2026 | First version. Base path `/api/v1`, snake_case keys, default `limit` 10, maximum 50, `404` for non-members. |
| v2 | 11 November 2026 | Added `admin_actions.target_id` and chat `next_cursor` to the string IDs. Dates now written with milliseconds. `exam_date` is formatted by each reply shape. Added pagination input rules (bad values, biggest page, past the last page) and the DTO rule for `page` and `limit`. Added error rules: snake_case field names, unknown fields give `400`, broken JSON gives `400`, `5xx` messages are generic, and the database error table. Added the controller rule (whole DTO, never one key by name), the prototype pollution note, and the file locations in Section 9. |
| v3 | 12 November 2026 | The Step 5 code was run and checked. No rule changed. Updated the status line. Added a note in Section 1 that `/` is answered by Express with a plain page and is not in the error shape. The related file is now `nestjs_setup_v4.md`. |
