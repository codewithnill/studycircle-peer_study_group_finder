# StudyCircle — Backend Setup (NestJS + Prisma + PostgreSQL)

**Last updated:** 12 November 2026

## What Changed in This Version

This version keeps everything from v3 (Steps 1 to 21). The Step 5 code was run and checked, so this version records the results and fixes two wrong claims.

| Type | What | Where in this file |
|---|---|---|
| UPDATED | The status line of Part 3 now says the Step 21 checks passed | Part 3 |
| FIXED | `http://localhost:3000/` shows Express's plain "Cannot GET /" page with a 404 status. It does not show the JSON error shape. Only addresses that start with `/api/v1` use the error shape. | Step 6, Step 21, Troubleshooting |
| ADDED | Troubleshooting row for the `TS1261` folder-case error (`Pipes` and `pipes`) | Troubleshooting |
| ADDED | Rule: keep folder names lowercase | Rules to Never Forget |
| UPDATED | The API shape file is now `studycircle_api_shape_v3.md` | Several places |

## What This Setup Produces

StudyCircle is a peer study group finder platform maintained as one monorepo. This setup creates the NestJS backend, connects it to PostgreSQL through Prisma, and reserves folders for the planned Next.js frontend and project documentation.

| Location | Purpose | Final state |
|---|---|---|
| `backend/` | NestJS and TypeScript backend | Scaffolded, installed, runnable, connected to PostgreSQL through Prisma, with the shared API layer and six empty feature modules |
| `backend/prisma/` | Prisma schema and migrations | 17 tables, 10 enums, 2 migrations |
| `backend/src/common/` | Shared fixed words, helpers, pipes, interceptor, and filter | 15 files that apply the API shape rules |
| `frontend/` | Planned Next.js frontend with React 19, TypeScript, and Tailwind CSS | Empty placeholder folder |
| `documentation/` | Project documentation | Contains this setup reference |
| `.git/` | Monorepo Git metadata | At the repository root only |

The backend data layer is PostgreSQL with Prisma ORM. Jest is included for tests. Every reply follows the API shape rules in `studycircle_api_shape_v3.md`. The four team areas are Auth & User Profiles; Groups & Search; Requests, Members & Chat; and Scheduling, Notes & Admin Panel.

## Prerequisites

Use Windows, PowerShell, and the VS Code terminal. Node.js 20 or later is required. The setup was completed with these versions:

| Tool | Version used |
|---|---:|
| Node.js | `v24.16.0` |
| npm | `12.0.2` |
| Git | `2.53.0.windows.1` |
| Nest CLI | `12.0.11` |
| TypeScript | `6.0.x` (scaffold range `^6.0.2`) |
| NestJS packages | `^12.0.1` |
| Jest | `^30.0.0` |
| PostgreSQL | `18.6` (port `5432`) |
| Prisma CLI (`prisma`) | `7.10.1` (exact) |
| Prisma Client (`@prisma/client`) | `7.10.1` (exact) |
| Prisma PostgreSQL adapter (`@prisma/adapter-pg`) | `7.10.1` (exact) |
| `pg` | `^8.23.1` |
| `@nestjs/config` | `^12.1.1` |
| `dotenv` | `^17.2.1` (dev only) |
| `class-validator` | `^0.15.1` |
| `class-transformer` | `^0.5.1` |

The three Prisma packages are pinned to the **exact** same version on purpose. See the rules at the end.

Run the required version checks as separate commands:

```bash
node --version
```

```bash
npm --version
```

```bash
git --version
```

## Step 1 — Create the Repository Folder Structure

Work from the repository root. Create the three monorepo folders before installing or scaffolding project code.

```bash
mkdir backend, frontend, documentation
```

The NestJS project must use the folder name `backend`. The `frontend/` and `documentation/` folders are reserved for later work.

## Step 2 — Add the Root .gitignore

Create and commit `.gitignore` at the repository root before creating any environment file or installing project dependencies. The `.gitignore` is committed because it is shared team configuration.

The first environment rule must block `.env` files before any `.env` can ever be created:

```gitignore
.env
.env.*
!.env.example
!.env.sample
```

The root `.gitignore` also blocks these categories:

| Category | Examples blocked |
|---|---|
| Secrets and environment files | `.env`, `.env.*`, private keys |
| Dependencies | `node_modules/`, package-manager logs |
| Build output | `dist/`, `build/`, `.next/`, `out/`, `*.tsbuildinfo` |
| Prisma and database artifacts | Generated Prisma client (`backend/src/generated/`), local database files, temporary migration files |
| Private uploads | `backend/uploads/`, `backend/private/`, upload folders |
| Test output | `coverage/`, `.nyc_output/`, coverage files |
| Logs and operating-system noise | Log files, `.DS_Store`, `Thumbs.db`, `Desktop.ini` |
| Editor and temporary files | Personal VS Code settings, `.idea/`, swap files, cache folders |

**Team rule:** `.env` files are never committed. The `.gitignore` rule must exist before an `.env` file is created. If an environment file, dependency folder, build output, generated client, or private upload folder appears as an untracked item, stop and correct the ignore rules before committing.

## Step 3 — Install the NestJS CLI Globally

Install the exact Nest CLI version used for this setup:

```bash
npm install -g @nestjs/cli@12.0.11
```

A global install makes the `nest` command available machine-wide. It is a development tool, not application code stored in the repository.

Verify the CLI installation:

```bash
nest --version
```

The expected result is `12.0.11`.

## Step 4 — Create the NestJS Backend Project

From the repository root, create the project in `backend/` and prevent Nest from creating a second Git repository:

```bash
nest new backend --skip-git
```

Answer the two interactive prompts as follows:

| Prompt | Answer |
|---|---|
| Include `@nestjs/observe`? | `No` |
| Module system | `CJS (CommonJS)` |

The `--skip-git` option is required because `studycircle-peer_study_group_finder` already has `.git` at the monorepo root. Without this option, Nest creates a nested `.git` inside `backend/`. A nested repository prevents the root repository from tracking the backend normally.

The scaffold installs the backend dependencies and creates the standard source, test, configuration, and package files. The Nest 12 scaffold also includes `.oxlintrc.json`, `AGENTS.md`, `.prettierrc`, and `jest.config.ts`. These files are expected with Nest 12 even when older Nest documentation does not mention them.

## Step 5 — Configure TypeScript for Nest 12

Keep these values in `backend/tsconfig.json` from the start:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "bundler",
    "resolvePackageJsonExports": true
  }
}
```

These are mandatory for the installed toolchain. TypeScript 6 deprecates the older `node` and `node10` module-resolution values. Nest 12's scaffold sets `resolvePackageJsonExports: true`, which requires `node16`, `nodenext`, or `bundler`. `bundler` satisfies that requirement while preserving CommonJS output for the backend.

The remaining compiler settings stay as generated by the Nest scaffold, including strict type checking, decorators, declarations, source maps, and the `dist/` output directory.

`backend/tsconfig.build.json` extends `backend/tsconfig.json` and only narrows the build root and included source files. No separate module or module-resolution change is needed there.

**The Prisma setup did not change `tsconfig.json`.** It was only changed in the scaffold commit.

## Step 6 — Run the Development Server

Move into the backend folder before running backend scripts:

```bash
cd backend
```

Start the Nest development server in watch mode:

```bash
npm run start:dev
```

`npm run start:dev` maps to `nest start --watch`. It is the correct development command for this project. `npm run dev` is not a NestJS script and does not exist in the generated `package.json`.

A successful startup includes a message similar to:

```text
Found 0 errors. Watching for file changes.
```

Open the following address in a browser. The address depends on whether Step 20 (the `/api/v1` prefix) is done yet:

| Stage | Address | Response |
|---|---|---|
| Before Step 20 | `http://localhost:3000/` | `Hello World!` |
| After Step 20 | `http://localhost:3000/api/v1` | `{"data":"Hello World!"}` |

After Step 20, `http://localhost:3000/` no longer shows the page. It shows Express's plain "Cannot GET /" page with a 404 status. This is the prefix working as planned. Only addresses that start with `/api/v1` use the standard error shape. A request to `/` never reaches the Nest router, so the exception filter does not see it.

The server remains active in watch mode until it is stopped. Press `Ctrl+C` in the terminal to stop it.

**Port note:** Next.js also defaults to port `3000`. When the frontend is added, one application must use a different port. The likely choice is to run Next.js on port `3001`.

## Step 7 — Verify the Setup

Run these checks from the repository root or the appropriate folder:

- The repository root contains `.git/`.
- `backend/` does not contain a nested `.git/` folder.
- `git status` shows the expected new project items and does not show ignored dependencies, build output, or environment files.
- The development server starts with `npm run start:dev`.
- The development log reports `Found 0 errors`.
- `http://localhost:3000/` displays `Hello World!`. (After Step 20, use `http://localhost:3000/api/v1`. It displays `{"data":"Hello World!"}`.)
- The backend build and tests can be run with the commands in the cheat sheet below.

---

# Part 2 — Database and Prisma Setup (ADDED)

**What problem this solves:** four students must build pieces that fit together. One shared database design, with rules enforced by the database itself, stops the pieces from breaking each other. It also supports the core promise of the project: students can find and manage study groups safely.

The schema itself (every table and column) is described in `studycircle_database_schema_mvp_v3.md`. The exact enum words are in `studycircle_fixed_values.md`. This part only explains how the database and Prisma are set up.

## Step 8 — Create PostgreSQL, the Databases, and the User

Install PostgreSQL (version `18.6` was used) and note the port (`5432`) and the password of the `postgres` admin user.

Create three things:

| Item | Name | Why |
|---|---|---|
| App user | `studycircle_user` | The app logs in with this user. It has **no superuser powers**, so a bug cannot damage the whole PostgreSQL server. |
| Main database | `studycircle` | Holds the real tables and data. |
| Shadow database | `studycircle_shadow` | A scratch database that Prisma uses only when creating migrations. It checks that the migration files really match the schema. Never put real data in it. |

Run this as the `postgres` admin user (for example in DBeaver). Use your own password. Never commit a real password.

```sql
CREATE USER studycircle_user WITH PASSWORD 'your_password_here';
CREATE DATABASE studycircle;
CREATE DATABASE studycircle_shadow;
GRANT ALL PRIVILEGES ON DATABASE studycircle TO studycircle_user;
GRANT ALL PRIVILEGES ON DATABASE studycircle_shadow TO studycircle_user;
```

Newer PostgreSQL versions do not let normal users create tables in the `public` schema. So connect to **each** database (`studycircle` and `studycircle_shadow`) and run this once in each:

```sql
GRANT ALL ON SCHEMA public TO studycircle_user;
```

Without this, Prisma fails with a "permission denied" error.

## Step 9 — Install the Prisma and Database Packages

Run these commands from the `backend/` folder, one at a time.

The Prisma packages are installed with `--save-exact`. That removes the `^` sign, so nobody gets a newer version by accident.

```bash
npm install --save-exact @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1
```

```bash
npm install --save-exact --save-dev prisma@7.10.1
```

```bash
npm install @nestjs/config pg
```

```bash
npm install --save-dev dotenv
```

What each package does:

| Package | Plain-English job |
|---|---|
| `prisma` | The command-line tool (generate, migrate, studio). Development only. |
| `@prisma/client` | The code the app uses to talk to the database. |
| `@prisma/adapter-pg` | Prisma 7 needs a "driver adapter". This one connects Prisma to PostgreSQL. |
| `pg` | The PostgreSQL driver that the adapter uses. |
| `@nestjs/config` | Lets NestJS read the `.env` file. NestJS does not read it by itself. |
| `dotenv` | Lets the Prisma command-line tool read the `.env` file. |

**Version warning:** never run `npm install prisma@latest`. The `latest` tag on npm now points to a Prisma 8 pre-release. It is a different tool and does not have the `prisma migrate` and `prisma generate` commands that this project uses.

If npm blocks the install scripts of Prisma, approve only the packages that need them:

```bash
npm install-scripts approve @parcel/watcher prisma @prisma/engines
```

After installing, open `backend/package.json` and check that `prisma`, `@prisma/client`, and `@prisma/adapter-pg` all show `7.10.1` with **no** `^` sign.

## Step 10 — Create the Environment Files

Create two files in `backend/`:

| File | Content | Committed? |
|---|---|---|
| `backend/.env` | Real database links with the real password | **No, never.** Blocked by `.gitignore`. |
| `backend/.env.example` | The same names with fake values | Yes. It tells teammates which variables to fill in. |

`backend/.env.example` looks like this:

```text
DATABASE_URL="postgresql://user:password@localhost:5432/studycircle?schema=public"
SHADOW_DATABASE_URL="postgresql://user:password@localhost:5432/studycircle_shadow?schema=public"
```

In `backend/.env`, replace `user` with `studycircle_user` and `password` with the real password.

Before putting any real value in `.env`, prove that Git ignores it. Run this from the repository root. It must print the `.gitignore` rule:

```bash
git check-ignore -v backend/.env
```

## Step 11 — Create the Prisma Config File

Prisma 7 reads its settings from a file in `backend/`. The file name must be exactly `prisma.config.ts`.

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
```

What it says:

1. `schema` is where the schema file lives.
2. `migrations.path` is where the migration files are saved.
3. `datasource.url` is the main database link, read from `.env`.
4. `datasource.shadowDatabaseUrl` is the shadow database link, read from `.env`.

**Do not use another file name** (for example `prisma7.config.ts`). It is not the standard name, and it confuses teammates.

## Step 12 — Write the Schema File

The file is `backend/prisma/schema.prisma`. It starts with these two blocks:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

Why the generator looks like this:

1. `prisma-client` is the current Prisma generator. The older `prisma-client-js` is marked as deprecated in Prisma 7.
2. `output` is required. The generated code goes into `backend/src/generated/prisma`.
3. `moduleFormat = "cjs"` says "this is a CommonJS project". NestJS in this repository uses CommonJS.
4. The `datasource` block has **no** `url`. In Prisma 7 the link comes from `prisma.config.ts`.

The generated folder is **not committed**. The root `.gitignore` blocks `backend/src/generated/`. Everyone must run `npx prisma generate` after cloning and after pulling changes to `schema.prisma`.

What the schema contains:

| Part | Summary |
|---|---|
| Models | 17: `User`, `RefreshToken`, `Subject`, `Level`, `UserSubject`, `Group`, `GroupMember`, `JoinRequest`, `StudySession`, `SessionAttendance`, `Review`, `Message`, `GroupPost`, `GroupFile`, `Notification`, `Report`, `AdminAction` |
| Enums | 10: `Role`, `UserStatus`, `Mode`, `GroupStatus`, `GroupMemberRole`, `GroupMemberStatus`, `JoinRequestStatus`, `SessionStatus`, `ReportTargetType`, `ReportStatus` |
| Names | Models are singular PascalCase. Tables and columns are snake_case (set with `@@map` and `@map`). |
| Not enums on purpose | `notifications.type`, `reports.reason`, `admin_actions.action`, `admin_actions.target_type` stay `varchar`. The code checks the allowed words later. |
| Reserved columns | `users.institution_id` and `groups.institution_id` have no relation yet. |
| Delete rules | Only `RefreshToken.user` and `UserSubject.user` use `Cascade`. Everything else uses `Restrict`, because the project uses soft deletes (`deleted_at`) and keeps history. |
| Named relations | Tables that point to `users` more than once use named relations (for example `GroupLeader`, `RemovedBy`, `ReviewedBy`). |

Check the file at any time:

```bash
npx prisma validate
```

```bash
npx prisma format
```

## Step 13 — Create the Migrations

A migration is a saved SQL file that builds or changes the tables. The files in `backend/prisma/migrations/` are committed, so everyone builds the same database.

There are two migrations:

| Migration | What it does |
|---|---|
| `20261106174645_init` | Creates all 17 tables, the enums, the foreign keys, the unique rules, and the normal indexes. It also holds **two hand-written SQL indexes** (below). |
| `20261107061259_change_delete_rules` | Changes three foreign keys from `Cascade` to `Restrict` (`session_attendance.session_id`, `reviews.session_id`, `notifications.user_id`). |

The two hand-written indexes were added at the end of the `init` migration file. Prisma cannot write this kind of index by itself (a "partial" index only covers rows that match a condition):

```sql
-- One pending join request per student per group.
CREATE UNIQUE INDEX "join_requests_one_pending_per_user_group"
ON "join_requests" ("group_id", "user_id")
WHERE "status" = 'pending';

-- Exactly one active leader per group.
CREATE UNIQUE INDEX "group_members_one_active_leader_per_group"
ON "group_members" ("group_id")
WHERE "role" = 'leader' AND "status" = 'active';
```

Why they matter: the **database itself** refuses a duplicate pending request and a second active leader, even if the code has a bug. Both rules were tested with real inserts. The database answered with error `23505` (duplicate key).

Commands (run from `backend/`):

| Purpose | Command |
|---|---|
| Create and apply a new migration | `npx prisma migrate dev --name short_name_here` |
| Apply migrations that a teammate committed | `npx prisma migrate dev` |
| Check migration status | `npx prisma migrate status` (it should say "Database schema is up to date!") |

**Migration rules:**
1. **Never edit a migration that was already applied or pushed.** Create a new migration instead.
2. Use `--create-only` only when you need to edit the SQL by hand before it runs.
3. After any migration, check that the two partial indexes still exist.

## Step 14 — Connect NestJS to the Database

Four small pieces connect the app to the database:

| File | Job |
|---|---|
| `backend/src/prisma/prisma.service.ts` | Extends the generated `PrismaClient`. It reads `DATABASE_URL` through `ConfigService`, stops with a clear error if it is missing, builds the PostgreSQL adapter, connects in `onModuleInit`, and disconnects in `onModuleDestroy`. It never prints the URL (it contains the password). |
| `backend/src/prisma/prisma.module.ts` | A `@Global()` module that provides and exports `PrismaService`. Only this module creates the database connection. Other modules just inject `PrismaService`. |
| `backend/src/app.module.ts` | Imports `ConfigModule.forRoot({ isGlobal: true })` (loads `.env`) and `PrismaModule`. |
| `backend/src/main.ts` | Calls `app.enableShutdownHooks()` so `onModuleDestroy` runs when the server stops. Then the database connection closes cleanly. |

The import for the client is:

```typescript
import { PrismaClient } from '../generated/prisma/client';
```

**Do not** import it from `@prisma/client`. With the new generator, the client lives in the generated folder.

## Step 15 — Verify the Database

Run these checks:

- `npx prisma validate` says the schema is valid.
- `npx prisma migrate status` says "Database schema is up to date!".
- `npm run build` finishes with no errors (run it in `backend/`).
- `npm test` passes.
- `npm run start:dev` shows `Found 0 errors`, and `http://localhost:3000/` shows `Hello World!`. (After Step 20, use `http://localhost:3000/api/v1` instead.)
- Connect to the `studycircle` database and run these queries:

```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

The count should be `18` (17 tables plus Prisma's `_prisma_migrations` table).

```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%one_%';
```

This should list the two partial indexes.

```sql
SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;
```

This should list two migrations, both with a `finished_at` date.

- `git status` does not show `.env`, `node_modules/`, `dist/`, or anything in `src/generated/`.

---

# Part 3 — Shared API Layer and Feature Modules (ADDED)

**What problem this solves:** four students write routes at the same time. Without shared rules, each route would reply in its own shape, and one route could leak a database detail in an error. The shared layer makes every reply follow `studycircle_api_shape_v3.md`, so the frontend reads every reply the same way. It also creates the six feature folders, so each person works in a separate place.

> **Status (12 November 2026):** the code in this part is written and the Step 21 checks passed. The build has no errors, 38 unit tests pass (5 suites), the server starts with `Found 0 errors`, and the `/api/v1` reply and the 404 error shape were checked on the running server. One fix was needed: the folder `src/common/Pipes` had a capital letter and was renamed to `pipes` (see Troubleshooting). The checks that need a real route are still open (see the end of Step 21).

The rules for every reply are in `studycircle_api_shape_v3.md`. If the code and that file disagree, that file wins.

**The shared API layer did not change `tsconfig.json`.** The values `"module": "commonjs"` and `"moduleResolution": "bundler"` stay as they are.

## Step 16 — Install the Validation Packages

Run this from the `backend/` folder:

```bash
npm install class-validator class-transformer
```

What each package does:

| Package | Plain-English job |
|---|---|
| `class-validator` | Lets a DTO (a class that describes allowed input) carry rules, like "this must be an email". |
| `class-transformer` | Turns plain incoming data into a real DTO object. NestJS's `ValidationPipe` needs it. |

npm reports `added 5 packages`. That is the two packages above plus three small helper packages that `class-validator` needs itself. The helpers show up only in `package-lock.json`.

Check `backend/package.json` before the commit. It must show these two new lines, and no scaffold package may be missing:

```text
"class-transformer": "^0.5.1",
"class-validator": "^0.15.1",
```

Commit `package.json` and `package-lock.json` together.

npm may print a vulnerability warning after the install. **Never run `npm audit fix --force`.** It can upgrade packages across major versions and break NestJS or Prisma. Run `npm audit` and read the list first.

## Step 17 — Add the Fixed-Value Constants

The folder is `backend/src/common/constants/`. The fixed `varchar` lists (Part B of `studycircle_fixed_values.md`) become constants here. The Part A enums do not. They come from Prisma.

| File | What it holds |
|---|---|
| `notification-types.ts` | The 7 notification types, the 4 payload keys, and the `NotificationPayload` type. |
| `report-reasons.ts` | The 5 report reasons. |
| `admin-actions.ts` | The 17 admin actions, the 8 admin target types, and a table that says which target type each action uses. |
| `file-upload.ts` | The 6 allowed MIME types, the 10 MB limit, and the `isAllowedFileMimeType` check. |
| `index.ts` | One import point for all of the above. |

Rules:
1. Import the words from `src/common/constants`. Never type them by hand.
2. If a list changes, change `studycircle_fixed_values.md` and the constants file in the same pull request.
3. The table in `admin-actions.ts` is typed so that the build fails if an action has no target type. This is on purpose.

## Step 18 — Add the Shared API Helpers

All of these files are in `backend/src/common/`.

| File | What it does |
|---|---|
| `utils/case-converter.ts` | Changes object keys between camelCase and snake_case, deep inside objects and lists. It skips dates, file bytes, and streams. It drops the keys `__proto__`, `constructor`, and `prototype` (a safety rule against prototype pollution). |
| `pagination/pagination.ts` | Reads `page` and `limit`. Default limit 10, maximum 50, page at least 1 and at most 1,000,000. Builds the `meta` block. Gives services a `paginated()` helper for list replies. |
| `pipes/snake-to-camel.pipe.ts` | A global pipe. Changes the keys of the incoming body and query to camelCase. Route parameters are not changed. |
| `pipes/validation-pipe.factory.ts` | Builds the one `ValidationPipe` for the whole app. |
| `interceptors/response.interceptor.ts` | Wraps every success reply in `data`, adds `meta` for lists, turns bigint into strings, turns dates into UTC text, changes keys to snake_case, and skips file downloads. |
| `filters/all-exceptions.filter.ts` | Turns every error into the three-key error shape. Maps known database errors to friendly replies. Hides the details of server problems. |
| `utils/case-converter.spec.ts` | Jest tests for the case converter. |
| `pagination/pagination.spec.ts` | Jest tests for the pagination helper. |
| `interceptors/response.interceptor.spec.ts` | Jest tests for the response interceptor. |
| `filters/all-exceptions.filter.spec.ts` | Jest tests for the exception filter. |

**How one request moves through these files:**
1. The request arrives. Its address starts with `/api/v1`.
2. The snake-to-camel pipe changes the body and query keys to camelCase.
3. The validation pipe checks the data against the DTO.
4. The controller and the service do the work.
5. The response interceptor wraps the reply and changes its keys to snake_case.
6. If anything fails along the way, the exception filter builds the error reply.

**Validation pipe settings:**

| Setting | What it does |
|---|---|
| `whitelist: true` | Removes any field that the DTO does not list. This stops "mass assignment", where someone adds a field like `role: "admin"`. |
| `forbidNonWhitelisted: true` | Refuses the request with a 400 instead of dropping the field quietly. A DTO for a list route must therefore list `page` and `limit` (with `@IsOptional()` only). |
| `transform: true` | Gives the controller a real DTO object after the checks pass. |
| `validationError: { target: false, value: false }` | Error objects never carry the input. A failed password check must not carry the password around. |
| `exceptionFactory` | Builds the `errors` list with snake_case field names. |

**Database errors the filter maps by default:**

| Code | Status | Message |
|---|---|---|
| `P2002` | 409 | This value is already in use |
| `P2003` | 409 | This item is still linked to other data |
| `P2025` | 404 | Not found |
| `P2034` | 409 | The server was busy. Please try again |
| Any other code | 500 | Something went wrong on our side |

The filter checks the error's name (`PrismaClientKnownRequestError`) and its code. It imports nothing from Prisma. A service should still catch the cases it knows well (for example a second pending join request) and give an exact message.

**Rule for controllers:** always take the whole body or query as one DTO object, like `@Body() dto` and `@Query() dto`. Never pick one key by name, like `@Query('max_size')`.

## Step 19 — Create the Six Empty Feature Modules

Each feature gets its own folder and its own empty module. This is a modular monolith: one app and one database, split by feature inside.

| File | What it will hold later |
|---|---|
| `backend/src/auth/auth.module.ts` | Register, login, logout, refresh tokens, guards (week 2) |
| `backend/src/users/users.module.ts` | User profiles (week 2) |
| `backend/src/groups/groups.module.ts` | Groups, search, join requests, members, leadership rules (weeks 3 to 5) |
| `backend/src/sessions/sessions.module.ts` | Study sessions, "I will attend", attendance, mark as completed (week 6). Reviews come in week 10. |
| `backend/src/chat/chat.module.ts` | The WebSocket gateway and messages (weeks 6 and 7) |
| `backend/src/admin/admin.module.ts` | Dashboard, tables, moderation, activity log (weeks 9 and 10) |

Each file holds only `@Module({})` for now. Then `backend/src/app.module.ts` imports all six, next to `ConfigModule` and `PrismaModule`.

Rules for the modules:
1. Modules talk through services. If `groups` needs something from `users`, `UsersModule` exports a service and `GroupsModule` imports that module.
2. Tools that every feature needs go in `src/common/`.
3. Only `PrismaModule` makes the database connection. Other modules inject `PrismaService`.

The 3-month plan (Section 8) also names modules for posts, files, notifications, and reports. They are added in the weeks that build them.

## Step 20 — Wire the Helpers in main.ts

`backend/src/main.ts` switches everything on. The new lines come after `NestFactory.create(AppModule)` and before `app.listen(...)`:

```typescript
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new SnakeToCamelPipe(), createValidationPipe());
app.useGlobalInterceptors(new ResponseInterceptor());
app.useGlobalFilters(new AllExceptionsFilter());
app.enableShutdownHooks();
```

Notes:
1. The prefix is set only here. Controllers never repeat it.
2. The order of the two pipes matters. The snake-to-camel pipe must run first, because the DTO rules expect camelCase names.
3. After this step, the starter route moves from `http://localhost:3000/` to `http://localhost:3000/api/v1`.
4. CORS and the cookie reader are added in week 2, together with login.

## Step 21 — Verify the Shared API Layer

Run these checks:

- `npm run build` (in `backend/`) finishes with no errors.
- `npm test` passes, including the four new spec files (38 tests in 5 suites when checked on 12 November 2026).
- `npm run start:dev` shows `Found 0 errors`.
- `http://localhost:3000/api/v1` shows `{"data":"Hello World!"}`.
- `http://localhost:3000/` shows Express's plain "Cannot GET /" page with a 404 status. It is not the JSON error shape (see Step 6).
- `http://localhost:3000/api/v1/unknown` shows a 404 in the error shape (`status_code`, `message`, and an empty `errors` list).
- `git status` does not show `.env`, `node_modules/`, `dist/`, or anything in `src/generated/`.

Checks that need a real route (run them when the first routes exist):
- Send a body with a snake_case key like `max_size`. It must reach the code as `maxSize` and be validated.
- Send a body with a field that the DTO does not list. It must give a 400 with an `errors` item.
- Break each of the two partial indexes (a second pending join request, a second active leader) with a real request. Check which database code comes back. The map above expects `P2002` and a 409 reply.

---

## Final Folder Structure (Just After NestJS Setup)

This is the exact folder and file structure immediately after running the NestJS setup commands (Steps 1 to 7). A zipped copy of this repository matches this state. The tree represents the project state **just after the NestJS setup is complete**. Dependency contents are collapsed because `node_modules/` contains thousands of generated files. Git internals are also collapsed to keep the verification tree readable.

```text
studycircle-peer_study_group_finder/
├── .git/
│   └── ... (Git metadata)
├── .gitignore
├── backend/
│   ├── .gitattributes
│   ├── .oxlintrc.json
│   ├── .prettierrc
│   ├── AGENTS.md
│   ├── README.md
│   ├── dist/
│   │   ├── app.controller.d.ts
│   │   ├── app.controller.js
│   │   ├── app.controller.js.map
│   │   ├── app.module.d.ts
│   │   ├── app.module.js
│   │   ├── app.module.js.map
│   │   ├── app.service.d.ts
│   │   ├── app.service.js
│   │   ├── app.service.js.map
│   │   ├── main.d.ts
│   │   ├── main.js
│   │   └── main.js.map
│   ├── jest.config.ts
│   ├── nest-cli.json
│   ├── node_modules/
│   │   └── ... (dependencies)
│   ├── package-lock.json
│   ├── package.json
│   ├── src/
│   │   ├── app.controller.spec.ts
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── test/
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   ├── tsconfig.build.json
│   ├── tsconfig.build.tsbuildinfo
│   └── tsconfig.json
├── documentation/
│   └── (empty before this document is added)
└── frontend/
    └── (empty placeholder folder)
```

`dist/` and `tsconfig.build.tsbuildinfo` are generated build artifacts. They are shown because they are present in the provided archive; the root `.gitignore` blocks them from being committed. `backend/node_modules/` is also present locally but is ignored by Git.

## Final Folder Structure (After Prisma Setup) (ADDED)

This shows only what is **new or changed** in `backend/` after Part 2. Everything else stays as in the tree above.

```text
backend/
├── .env                          (real secrets, NOT committed)
├── .env.example                  (fake values, committed)
├── prisma.config.ts              (Prisma settings, committed)
├── prisma/
│   ├── schema.prisma             (17 models, 10 enums)
│   └── migrations/
│       ├── 20261106174645_init/
│       │   └── migration.sql     (tables + 2 hand-written partial indexes)
│       ├── 20261107061259_change_delete_rules/
│       │   └── migration.sql     (3 foreign keys changed to Restrict)
│       └── migration_lock.toml
├── src/
│   ├── app.module.ts             (CHANGED: imports ConfigModule and PrismaModule)
│   ├── main.ts                   (CHANGED: shutdown hooks)
│   ├── generated/
│   │   └── prisma/               (generated client, NOT committed)
│   └── prisma/
│       ├── prisma.module.ts      (global module)
│       └── prisma.service.ts     (database connection)
└── package.json                  (CHANGED: Prisma packages, @nestjs/config, pg, dotenv)
```

## Final Folder Structure (After Shared API Layer) (ADDED)

This shows only what is **new or changed** after Part 3. Everything else stays as in the trees above.

```text
backend/
├── package.json                      (CHANGED: class-validator and class-transformer added)
└── src/
    ├── app.module.ts                 (CHANGED: imports the six feature modules)
    ├── main.ts                       (CHANGED: prefix, global pipes, interceptor, filter)
    ├── admin/
    │   └── admin.module.ts           (empty module)
    ├── auth/
    │   └── auth.module.ts            (empty module)
    ├── chat/
    │   └── chat.module.ts            (empty module)
    ├── groups/
    │   └── groups.module.ts          (empty module)
    ├── sessions/
    │   └── sessions.module.ts        (empty module)
    ├── users/
    │   └── users.module.ts           (empty module)
    └── common/
        ├── constants/
        │   ├── admin-actions.ts
        │   ├── file-upload.ts
        │   ├── index.ts
        │   ├── notification-types.ts
        │   └── report-reasons.ts
        ├── filters/
        │   ├── all-exceptions.filter.ts
        │   └── all-exceptions.filter.spec.ts
        ├── interceptors/
        │   ├── response.interceptor.ts
        │   └── response.interceptor.spec.ts
        ├── pagination/
        │   ├── pagination.ts
        │   └── pagination.spec.ts
        ├── pipes/
        │   ├── snake-to-camel.pipe.ts
        │   └── validation-pipe.factory.ts
        └── utils/
            ├── case-converter.ts
            └── case-converter.spec.ts
```

## Troubleshooting

| Symptom | Cause | Action |
|---|---|---|
| `nest` is not recognized | The global npm binary folder is not available in the PowerShell `PATH`, or the CLI was not installed globally. | Run `npm install -g @nestjs/cli@12.0.11`. If the command still is not recognized, add npm's global binary folder to `PATH`, restart the VS Code terminal, and run `nest --version`. |
| `TS5098` or `TS5107` mentions `moduleResolution` | `tsconfig.json` uses an incompatible module-resolution value for TypeScript 6 and `resolvePackageJsonExports`. | Set `"module": "commonjs"` and `"moduleResolution": "bundler"`. Keep `"resolvePackageJsonExports": true`. |
| `ENOENT` or files cannot be found | The command is being run from the wrong folder. | Use `cd backend` before backend scripts. Return to the repository root before root-level commands. |
| `EADDRINUSE` for port `3000` | Another process is already using the Nest or planned Next.js default port. | Stop the other process, or run the application on another port. When the frontend is added, use `3001` for Next.js if the backend remains on `3000`. |
| A second project appears inside `backend/` | Nest was run from inside `backend/`, or the project was created without the intended folder name. | Create the project from the repository root with `nest new backend --skip-git`. Remove the accidental nested project only after confirming that it contains no required work. |
| `permission denied for schema public` | The app user cannot create tables in the `public` schema (newer PostgreSQL versions). | Connect to the database as `postgres` and run `GRANT ALL ON SCHEMA public TO studycircle_user;`. Do this in both `studycircle` and `studycircle_shadow`. |
| Prisma error about the shadow database | `SHADOW_DATABASE_URL` is missing or wrong, or the shadow database does not exist or has no permissions. | Create `studycircle_shadow`, grant the permissions from Step 8, and check `SHADOW_DATABASE_URL` in `.env`. |
| `P1001: Can't reach database server` | PostgreSQL is not running, or the port, user, or password in `DATABASE_URL` is wrong. | Start PostgreSQL and check `backend/.env`. Never paste the real URL into chat or Git. |
| `DATABASE_URL is missing` when the app starts | `.env` does not exist, is in the wrong folder, or the variable name is misspelled. | Copy `.env.example` to `backend/.env` and fill in the real values. |
| `Cannot find module '../generated/prisma/client'` | The generated client does not exist yet. It is not committed. | Run `npx prisma generate` from `backend/`. |
| `Prisma Client` types look old after a pull | `schema.prisma` changed, but the client was not regenerated. | Run `npx prisma generate`. |
| `prisma migrate` or `prisma generate` command not found, or a Prisma 8 message appears | Prisma 8 was installed by accident (for example with `prisma@latest`). | Install the exact version: `npm install --save-exact --save-dev prisma@7.10.1`. |
| npm says install scripts were blocked | npm 12 blocks install scripts by default. | Run `npm install-scripts approve @parcel/watcher prisma @prisma/engines`. Approve only packages you trust. |
| `Error 23505` (duplicate key) on a test insert | A database rule refused a duplicate (for example a second active leader). | This is the rule working. Fix the test data, not the index. |
| A 404 at `http://localhost:3000/` | The `/api/v1` prefix is on (Step 20). | Use `http://localhost:3000/api/v1`. The plain "Cannot GET /" page at `/` is normal. It is not the JSON error shape. |
| `TS1261`: file name differs only in casing (for example `common/Pipes` and `common/pipes`) | A folder name on disk has a capital letter, but the code imports it in lowercase. Windows does not mind, but TypeScript refuses it, and Linux would break. | Rename the folder to lowercase in two steps from `src/common`: `Rename-Item Pipes pipes_temp`, then `Rename-Item pipes_temp pipes`. Git ignores case-only renames on Windows, so also run `git rm -r --cached src/common/Pipes` and then `git add src/common/pipes` from `backend/`. Commit, push, and check that GitHub shows the lowercase name. |
| A 400 `Validation failed` with `property ... should not exist` | The request has a field that the DTO does not list. Unknown fields are refused on purpose. | Remove the field from the request, or add it to the DTO if it belongs there. |
| A 400 on `?page=2` for a list route | The DTO does not list `page` and `limit`. | Add both to the DTO with `@IsOptional()` only. The pagination helper cleans the values. |
| `Cannot find module 'class-validator'` | The packages are not installed on this machine (for example after a pull). | Run `npm ci` from `backend/`. |
| A 500 reply that says "Something went wrong on our side" | The real error is hidden from the reply on purpose. | Read the terminal where `npm run start:dev` is running. The details are in the server log. |
| A database error gives 500 and not 409 or 404 | The Prisma error code is not in the exception filter's map. | Read the code in the terminal, add it to the map in `all-exceptions.filter.ts`, and add a test for it. |
| The build fails and mentions `Record<AdminAction, AdminTargetType>` | An admin action has no target type. | Add the action to the table in `admin-actions.ts`. |

## Quick Cheat Sheet

| Purpose | Command or action |
|---|---|
| Install the exact Nest CLI | `npm install -g @nestjs/cli@12.0.11` |
| Create the backend from the repository root | `nest new backend --skip-git` |
| Enter the backend folder | `cd backend` |
| Install packages from the lock file (fresh clone) | `npm ci` |
| Start the development server | `npm run start:dev` |
| Build the backend | `npm run build` |
| Run unit tests | `npm test` |
| Run end-to-end tests | `npm run test:e2e` |
| Stop the watch server | Press `Ctrl+C` |
| Check the running application | Open `http://localhost:3000/api/v1` (before Step 20: `http://localhost:3000/`) |
| Check the schema file | `npx prisma validate` |
| Tidy the schema file | `npx prisma format` |
| Generate the Prisma client | `npx prisma generate` |
| Create and apply a migration | `npx prisma migrate dev --name short_name_here` |
| Apply teammates' migrations | `npx prisma migrate dev` |
| Check migration status | `npx prisma migrate status` |
| Open the database viewer | `npx prisma studio` |
| Install the validation packages | `npm install class-validator class-transformer` |

## Rules to Never Forget

- `.env` files are never committed. The root `.gitignore` must block them before they are created.
- `.gitignore` is committed because it protects the whole monorepo.
- Do not create a nested `.git` inside `backend/`. Use `--skip-git` when scaffolding the backend.
- Use `npm run start:dev`, not `npm run dev`.
- Run `cd backend` before backend scripts.
- Keep the TypeScript values `"module": "commonjs"` and `"moduleResolution": "bundler"`.
- Port `3000` will collide when the Next.js frontend is added unless one application moves, likely to port `3001`.
- Keep `prisma`, `@prisma/client`, and `@prisma/adapter-pg` on the exact same version (`7.10.1`, no `^`). Never run `npm install prisma@latest`.
- After every `git pull`: run `npm ci` if `package.json` or `package-lock.json` changed, run `npx prisma generate` if `schema.prisma` changed, and run `npx prisma migrate dev` if new migration folders arrived.
- Never edit a migration that was already applied or pushed. Create a new migration.
- Never commit the generated client (`backend/src/generated/`).
- Only `PrismaModule` creates the database connection. Other modules inject `PrismaService`. Never create another `PrismaClient`.
- Never print or log `DATABASE_URL`. It contains the database password.
- Never run `npm audit fix --force`. It can upgrade packages across major versions and break NestJS or Prisma.
- Keep the config file name `prisma.config.ts`. Do not rename it.
- Commit `package.json` and `package-lock.json` together.
- Every route starts with `/api/v1`. The prefix is set only in `main.ts`.
- Reply shapes follow `studycircle_api_shape_v3.md`. If a rule must change, change that file first and give it a new version number.
- Controllers take the whole body or query as one DTO object. Never pick one key by name.
- Never send a raw Prisma object. Use a response shape that lists only the safe fields.
- Keep the pipe order in `main.ts`: the snake-to-camel pipe first, then the validation pipe.
- Import fixed words from `src/common/constants`. Never type them by hand.
- Never put real error text in an error reply. The details go to the server log only.
- Keep folder names lowercase. Windows ignores letter case, but TypeScript and Linux do not. If a folder name must change only in case, rename it through a temporary name, then fix Git with `git rm -r --cached` and `git add`.
