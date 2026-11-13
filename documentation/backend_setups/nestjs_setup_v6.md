# StudyCircle — Backend Setup (NestJS + Prisma + PostgreSQL)

**Last updated:** 13 November 2026

## What Changed in This Version

This version keeps everything from v5 (Steps 1 to 27). It adds Part 5, the test database (Steps 28 to 33), and records that the checks passed.

| Type | What | Where in this file |
|---|---|---|
| ADDED | Part 5: a separate test database, `studycircle_test`, so Jest e2e tests never touch the development database. It is built from the committed migrations, so it has the two partial unique indexes | Part 5, Steps 28 to 33 |
| ADDED | The `TEST_DATABASE_URL` variable | Step 29 |
| ADDED | Four support files and one test file in `backend/test/`, and three new lines in `jest-e2e.json` | Steps 30 to 33 |
| ADDED | The second allowed exception to the single-connection rule: the test helpers build their own Prisma client | Step 32, Rules to Never Forget |
| ADDED | Folder structure after the test database | Final Folder Structure (After Test Database) |
| ADDED | Troubleshooting rows, cheat sheet rows, and rules for the test database | Troubleshooting, Quick Cheat Sheet, Rules to Never Forget |
| UPDATED | Step 10 now points to the new `.env.example` variable | Step 10 |
| UPDATED | The backend table now lists `backend/test/` | What This Setup Produces |

## What This Setup Produces

StudyCircle is a peer study group finder platform maintained as one monorepo. This setup creates the NestJS backend, connects it to PostgreSQL through Prisma, and reserves folders for the planned Next.js frontend and project documentation.

| Location | Purpose | Final state |
|---|---|---|
| `backend/` | NestJS and TypeScript backend | Scaffolded, installed, runnable, connected to PostgreSQL through Prisma, with the shared API layer, six empty feature modules, a seed script, and a test database setup for e2e tests |
| `backend/prisma/` | Prisma schema, migrations, and the seed script | 17 tables, 10 enums, 2 migrations, and `seed.ts` with 11 helper files in `seed/` |
| `backend/src/common/` | Shared fixed words, helpers, pipes, interceptor, and filter | 15 files that apply the API shape rules |
| `backend/test/` | End-to-end tests and the test database setup | 1 starter test, 1 database check test, and 4 support files in `support/` |
| `frontend/` | Planned Next.js frontend with React 19, TypeScript, and Tailwind CSS | Empty placeholder folder |
| `documentation/` | Project documentation | Contains this setup reference |
| `.git/` | Monorepo Git metadata | At the repository root only |

The backend data layer is PostgreSQL with Prisma ORM. Jest is included for tests. Unit tests need no database. E2E tests use a separate test database called `studycircle_test`. Every reply follows the API shape rules in `studycircle_api_shape_v3.md`. The four team areas are Auth & User Profiles; Groups & Search; Requests, Members & Chat; and Scheduling, Notes & Admin Panel.

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
| `tsx` | `^4.23.15` (dev only) |
| `bcrypt` | `^6.0.0` |
| `@types/bcrypt` | `^6.0.0` (dev only) |

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

Step 23 adds one more variable to both files: `SEED_ADMIN_PASSWORD`. Step 29 adds `TEST_DATABASE_URL`.

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

# Part 4 — Seed Script (ADDED)

**What problem this solves:** the database is empty and no routes exist yet. Search, pagination, and the group pages cannot be tested on an empty database. The seed script fills it with fake demo data in one command, and it resets to a clean state in one command. It also makes the demo look alive, which is a Must in the 3-month plan.

> **Status (13 November 2026):** the seed script is written and checked. `npx tsc --noEmit` and `npm run build` pass with no errors. `npm run seed` passes 29 rule checks and prints the same counts on every run. Running it with `NODE_ENV` set to `production` is refused before anything is deleted. `group_files` rows are not seeded yet (see the end of Step 26).

The fixed words (statuses, modes, roles) come from `studycircle_fixed_values.md`. The tables come from `studycircle_database_schema_mvp_v3.md`. The seed uses the same words.

**The seed script did not change `tsconfig.json`.** The values `"module": "commonjs"` and `"moduleResolution": "bundler"` stay as they are. The seed files live in `backend/prisma/`, outside `src/`, so `npm run build` does not build them.

## Step 22 — Install the Seed Packages

Run these commands from the `backend/` folder, one at a time.

| Package | Type | Plain-English job |
|---|---|---|
| `tsx` | dev | Runs a TypeScript file directly, so `prisma/seed.ts` runs without a build. It does not touch `tsconfig.json`. |
| `bcrypt` | normal | Scrambles (hashes) passwords. The login code in week 2 will use it too. |
| `@types/bcrypt` | dev | Gives TypeScript the types for `bcrypt`. |

```bash
npm install --save-dev tsx
```

```bash
npm install bcrypt
```

```bash
npm install --save-dev @types/bcrypt
```

npm 12 blocks install scripts that are not approved. After the `bcrypt` install, npm warns that `bcrypt` had a blocked install script. Approve only `bcrypt`:

```bash
npm install-scripts approve bcrypt
```

npm also warns that the `esbuild` script (pulled in by `tsx`) is blocked. **Leave it blocked.** `tsx` works without it. The warning appears on each install, and that is harmless. Approve `esbuild` only if `tsx` stops working.

Check that both packages work. The first command should print the `tsx` and Node versions. The second should print `60`, the length of a bcrypt hash:

```bash
npx tsx --version
```

```bash
node -e "require('bcrypt').hash('test', 10).then(h => console.log(h.length))"
```

`bcrypt` is a runtime package, so also check the runtime audit. It should find `0 vulnerabilities`:

```bash
npm audit --omit=dev
```

The full `npm audit` still lists 26 vulnerabilities. They are all in development tools, and the count did not change with these installs. **Never run `npm audit fix --force`.** Review the list before submission (tracker item 19).

Before the commit, check the `package.json` diff. It must show only added lines: `bcrypt` under `dependencies`, `@types/bcrypt` and `tsx` under `devDependencies`, and `bcrypt@6.0.0` under `allowScripts`. No scaffold package may be missing. Commit `package.json` and `package-lock.json` together.

## Step 23 — Add the Seed Command and the Admin Password Variable

**1. `backend/prisma.config.ts`.** Add the `seed` line inside `migrations`, after `path`:

```typescript
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
```

Prisma 7 reads the seed command from this file. The command `npx prisma db seed` runs it. In Prisma 7, `migrate dev` and `migrate reset` do **not** run the seed by themselves. The seed runs only when you call it. Docs: https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding

**2. `backend/package.json`.** Add one line at the end of `scripts`, so that `npm run seed` works:

```json
"seed": "prisma db seed"
```

**3. `backend/.env.example`.** Add this variable with a fake value. Step 10 shows the first two lines of this file:

```text
# Demo only. The seed script uses this to set the admin password. Choose your own value in backend/.env.
SEED_ADMIN_PASSWORD="change_me_demo_only"
```

**4. `backend/.env`** (never committed). Add the same variable with your own real password of at least 8 characters. Do not reuse a password from anywhere else. The seed refuses to run when the value is missing, is the placeholder, or is shorter than 8 characters.

## Step 24 — Add the Safety Guards and the Seed Connection

Two small files in `backend/prisma/seed/`.

| File | Job |
|---|---|
| `guards.ts` | Two checks that run before anything else. `assertSafeToSeed()` refuses when `NODE_ENV` is `production`, and refuses when the host in `DATABASE_URL` is not `localhost`, `127.0.0.1`, or `[::1]`. `getAdminPassword()` reads `SEED_ADMIN_PASSWORD` and refuses a missing, placeholder, or short value. |
| `client.ts` | Builds the Prisma client for the seed with the PostgreSQL adapter. The client is imported from `src/generated/prisma/client`, never from `@prisma/client`. |

Why two guards: the seed deletes every row. The production check stops the worst mistake. The local-host check also stops a wipe of a remote or shared database when a wrong `.env` is loaded by mistake.

**The one allowed exception to the single-connection rule.** The rule says only `PrismaModule` creates the database connection. That rule is about the app code. The seed runs outside Nest, so it cannot use `PrismaService`. It builds its own client in `client.ts` and closes it at the end. No app code may copy this.

Safety rules the guards follow: error messages never print `DATABASE_URL` or the password, and a failed link check throws a new error so the original one (which can hold the link) is dropped.

## Step 25 — Add the Database Wipe

The file is `backend/prisma/seed/reset.ts`. It clears all 17 tables with one `TRUNCATE ... RESTART IDENTITY CASCADE` command. The ids start again at 1. The `_prisma_migrations` table is not listed, so the migration history stays safe. After the wipe, the file checks that the `users` table is empty and stops if it is not.

This is a justified use of raw SQL. Prisma has no single command that clears many linked tables and resets their id counters. The table names are fixed text in the code, and no user input is mixed in.

**Warning:** every seed run deletes all data in the development database, including accounts you made by hand. That is the point of "reset in one command". Never point the seed at data you want to keep.

## Step 26 — Add the Data Files

These files create the fake data. Each one has one job.

| File | What it does |
|---|---|
| `random.ts` | A small random number maker that starts from a fixed number (`SEED_NUMBER`). The same start gives the same data on every run. Change the number to get a different but still repeatable set. |
| `data.ts` | Every fake word list and setting: account settings, 3 levels, 12 subjects, names, bios, group titles, chat lines, and more. |
| `seed-users.ts` | 1 admin and 30 students. Every password is hashed with bcrypt. The demo student password is hashed once and reused, so the seed stays fast. |
| `seed-lookups.ts` | 3 levels, 12 subjects, and 2 to 4 subject interests for each student. |
| `seed-groups.ts` | 25 groups from a fixed plan, their members, and their join requests. |
| `seed-sessions.ts` | Study sessions, "I will attend" rows, and reviews. |
| `seed-chat.ts` | Chat messages and group posts. |
| `verify.ts` | Reads the finished data back and checks the project rules. It only reads. |
| `../seed.ts` | The entry file. It runs the guards, the wipe, each seed step in order, the checks, and then prints the counts. |

**What the data looks like:**

| Table | Result |
|---|---|
| `users` | 1 admin and 30 students. Emails use the reserved `.test` ending, so they can never be real. |
| `levels`, `subjects` | 3 levels (Beginner, Intermediate, Advanced) and 12 subjects. |
| `groups` | 25 groups: 20 active, 2 closed, 2 archived, and 1 removed. One is flagged. Two are full. Exam dates are in the past, in the future, or empty. Modes are a mix of online and in person. |
| `group_members` | Each group has one active leader. Some groups also have a member who left and a member who was removed. |
| `join_requests` | Requests in all four statuses. |
| `study_sessions` | Sessions in all three statuses. Online ones have a fake link on `example.com`. In-person ones have a place. |
| `session_attendance`, `reviews` | Attendance only from active members. Reviews only on completed sessions, only from members who attended. |
| `messages`, `group_posts` | Messages only from active members. Posts follow the posting and pinning rules. |
| `user_subjects` | The student interests. |

**Demo logins** (for when login is built in week 2):

| Account | Email | Password |
|---|---|---|
| Admin | `admin@studycircle.test` | The value of `SEED_ADMIN_PASSWORD` in your `.env` |
| Students | `student01@studycircle.test` to `student30@studycircle.test` | `Student@12345` (public on purpose, and safe only because the seed cannot run outside a local development database) |

**The rules the seed follows by itself.** The seed skips the app code, so it must keep the project rules on its own:

1. Every group has exactly one active leader. The group row (with `leader_id`) and the leader member row are created together in one database transaction.
2. Active members never go over `max_size`. The leader counts as a member.
3. A student has at most one pending request per group.
4. Every password is a bcrypt hash.
5. Only active members send chat messages, attend sessions, or write reviews.
6. `deleted_at` stays empty on every row.
7. Prisma Client fills `updated_at` by itself. Raw SQL would need to supply it.
8. All data is fake. No real person is used.

**Not seeded yet:** `group_files`, `refresh_tokens`, `notifications`, `reports`, and `admin_actions`. The `group_files` rows need real files on disk, and open decision 4 (where files are saved) is not settled, so they are added in week 7. The other four fill up when their features are built. Update the seed in week 11 (tracker item 42).

**When you change the group plan in `seed-groups.ts`:** also change `EXPECTED_GROUPS` in `verify.ts`, or the group count check fails.

## Step 27 — Run and Verify the Seed

Run from the `backend/` folder:

```bash
npm run seed
```

The expected output looks like this:

```text
seed: checks passed. wiping the development database...
seed: wipe done.
seed: verify passed. 29 checks ok.
seed: done. users 31, levels 3, subjects 12, groups 25, group members 113, join requests 109.
seed: sessions 55, attendance 149, reviews 44, messages 334, posts 26.
```

Run it a second time. Both summary lines must be **identical**, and there must be no duplicate errors. The counts stay the same until the seed number, the group plan, or the data lists change.

Then run these checks:

- `npx tsc --noEmit` prints nothing. The seed runs through `tsx`, which does not check types, so this catches mistakes that a normal run would miss.
- `npm run build` finishes with no errors.
- With `NODE_ENV` set to `production`, the seed is refused before anything is deleted. In PowerShell run these three commands one at a time. The last one clears the variable, or every later run will be refused:

```powershell
$env:NODE_ENV = "production"
```

```powershell
npm run seed
```

```powershell
Remove-Item Env:NODE_ENV
```

You can also check the leader and size rules by hand in DBeaver. Each query must return **0 rows**:

```sql
SELECT g.id, COUNT(gm.id) AS active_leaders
FROM groups g
LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.role = 'leader' AND gm.status = 'active'
GROUP BY g.id
HAVING COUNT(gm.id) <> 1;
```

```sql
SELECT g.id, g.max_size, COUNT(*) AS active_members
FROM groups g
JOIN group_members gm ON gm.group_id = g.id AND gm.status = 'active'
GROUP BY g.id, g.max_size
HAVING COUNT(*) > g.max_size;
```

DBeaver shows a "123" icon on number columns. That is the column type, not a value. Look at the bottom of the result panel. It should say 0 rows fetched.

# Part 5 — Test Database (ADDED)

**What problem this solves:** the seed script wipes data in development. If tests ran on the development database, a test run could wipe the demo data, and old demo data could break a test. The permission and leadership tests (one leader per group, no duplicate pending request, a non-member gets 404) also need the real database rules, including the two hand-written partial unique indexes. A separate test database, built from the committed migrations, gives the tests a clean place with the same rules.

> **Status (13 November 2026):** the test database setup is written and checked. `npx tsc --noEmit`, `npm run build`, and `npm test` (38 tests in 5 suites) pass. `npm run test:e2e` passes 4 tests in 2 suites. The Prisma output names `studycircle_test`, and a second run says "No pending migrations". With a fake link that has no `_test` in the name, the run stops in the global setup before any database is touched. Both partial indexes exist in `studycircle_test`. The development database kept its demo data (31 users). Nothing is committed that should not be.

**Part 5 did not change `tsconfig.json`, `prisma.config.ts`, the schema, or any migration. No new packages were installed.** The test files live in `backend/test/`, outside `src/`, so `npm run build` does not build them.

**How one e2e run works:**
1. `npm run test:e2e` starts Jest with `test/jest-e2e.json`.
2. `global-setup.ts` runs once. It switches the link to the test database, runs the guard, and runs `prisma migrate deploy`.
3. `test-env.ts` runs before each test file. It switches the link again inside that test process, so the app and the test code use the test database.
4. Each test file builds its own client with `createTestPrisma()`, and `beforeEach` calls `cleanDatabase()`. Every test starts with empty tables.
5. Test files run one at a time (`maxWorkers: 1`), because they all share one database.

## Step 28 — Create the Test Database

Run this as the `postgres` admin user in DBeaver, connected to the default `postgres` database. The app user has no power to create databases.

```sql
CREATE DATABASE studycircle_test;
GRANT ALL PRIVILEGES ON DATABASE studycircle_test TO studycircle_user;
```

Newer PostgreSQL versions give schema permission per database. So connect to `studycircle_test` itself and run this once:

```sql
GRANT ALL ON SCHEMA public TO studycircle_user;
```

Without this, `prisma migrate deploy` fails with "permission denied for schema public".

The shadow database is not needed here. `prisma migrate deploy` does not use it.

Check it:

| Query (run in the database named in the first column) | Expected |
|---|---|
| `postgres`: `SELECT datname FROM pg_database WHERE datname LIKE 'studycircle%' ORDER BY datname;` | 3 rows: `studycircle`, `studycircle_shadow`, `studycircle_test` |
| `studycircle_test`: `SELECT has_schema_privilege('studycircle_user', 'public', 'CREATE');` | `true` |
| `studycircle_test`: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';` | `0` before the first test run |

## Step 29 — Add the Test Database Link

Add one line to the end of `backend/.env` (never committed). Use the same user and password as `DATABASE_URL`, and change only the database name to `studycircle_test`.

Add this line to `backend/.env.example` (committed), after `SHADOW_DATABASE_URL`, with fake values:

```text
# Used only by the e2e tests. The database name must end with _test. Never point this at the development database.
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/studycircle_test?schema=public"
```

To print the line without the password, run this from `backend/`:

```powershell
(Select-String -Path .env -Pattern '^TEST_DATABASE_URL=').Line -replace ':[^:@]*@', ':***@'
```

To prove Git ignores the real file, run this from `backend/`:

```powershell
git check-ignore -v .env
```

## Step 30 — Add the Test Environment Helper and the Safety Guard

Two files in `backend/test/support/`.

| File | Job |
|---|---|
| `test-env.ts` | Loads `backend/.env` and copies `TEST_DATABASE_URL` into `DATABASE_URL`, inside the test process only. The app and Prisma read `DATABASE_URL`, so from then on they use the test database. It stops with a clear error when `TEST_DATABASE_URL` is missing. |
| `guard.ts` | `assertSafeTestDatabaseUrl()` stops the run unless the link passes every rule below. `getDatabaseName()` reads the database name out of a link. |

The guard rules:
1. The link must not be empty.
2. `NODE_ENV` must not be `production`.
3. The protocol must be `postgresql:` or `postgres:`.
4. The host must be `localhost`, `127.0.0.1`, or `[::1]`.
5. The database name must **end with** `_test`. A loose "contains test" rule is weaker, because a name like `latest_studycircle` would pass it.

The development database is called `studycircle`, which does not end with `_test`. So rule 5 also covers "the test database must not be the development database".

Safety rules these files follow: error messages never print the whole link (it holds the password), and a broken link throws a new error so the original one is dropped. The guard prints only the database name, which is not a secret.

## Step 31 — Add the Global Setup

The file is `backend/test/support/global-setup.ts`. Jest runs it once before all e2e tests. In this order, it:

1. Switches the link to the test database.
2. Runs the guard. **The guard must stay before the migrate command.** Nothing may touch a database before the guard says yes.
3. Prints `test setup: preparing the database "studycircle_test".` Only the name is printed.
4. Runs `npx prisma migrate deploy` inside `backend/`.

**Why `migrate deploy` and not `db push`:** `prisma migrate deploy` applies the committed migration files and does not compare or change the schema, so the test database gets exactly what the development database has, including the two hand-written partial indexes. `db push` would skip those indexes. Docs: https://docs.prisma.io/docs/cli/migrate/deploy

**Why the link reaches Prisma:** `prisma.config.ts` loads `.env` with `dotenv/config`, and `dotenv` does not replace a variable that is already set. So the test link, set by the helper, wins. This was proven by the Prisma output, which says `Datasource "db": PostgreSQL database "studycircle_test"`. Always read that line when you change the setup.

Because `migrate deploy` runs on every e2e run, a new migration from a teammate is applied to the test database by itself.

## Step 32 — Add the Test Client and the Table Cleaner

The file is `backend/test/support/clean-database.ts`.

| Function | What it does |
|---|---|
| `createTestPrisma()` | Runs the guard, then builds a Prisma client with the PostgreSQL adapter. The client is imported from `src/generated/prisma/client`, never from `@prisma/client`. |
| `assertConnectedToTestDatabase(prisma)` | Asks the database for its own name with `SELECT current_database()` and stops unless it ends with `_test`. This is the second check. The guard looks at the link text, and this looks at the database that really answered. |
| `cleanDatabase(prisma)` | Runs the second check, then reads all table names from the database (skipping `_prisma_migrations`) and clears them with one `TRUNCATE ... RESTART IDENTITY CASCADE`. The id counters start again at 1. |

**Why one `TRUNCATE`:** the delete rules use `Restrict`, so deleting table by table fails unless the order is perfect. One `TRUNCATE` over all linked tables avoids the order problem. Table names come from the database catalog, not from a person, and each name is wrapped in double quotes. Raw SQL is justified here for the same reason as in the seed: Prisma has no single command that clears many linked tables and resets their id counters.

**The second allowed exception to the single-connection rule.** Only `PrismaModule` creates the database connection in app code. The seed has its own client, and the test helpers have theirs. Tests that start the Nest app use `PrismaService` as usual. No app code may copy these.

**The seed never runs on the test database.** Each test creates only the rows it needs.

## Step 33 — Wire Jest, Add the Database Check Test, and Verify

**1. `backend/test/jest-e2e.json`.** Add three keys next to the scaffold keys:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "globalSetup": "<rootDir>/support/global-setup.ts",
  "setupFiles": ["<rootDir>/support/test-env.ts"],
  "maxWorkers": 1
}
```

What the new keys do: `globalSetup` runs the migrate step once, `setupFiles` switches the link before every test file, and `maxWorkers: 1` makes the files run one at a time. Without that last line, one test file could wipe another file's data.

**2. `backend/test/database-rules.e2e-spec.ts`.** Three tests prove the setup itself:

| Test | What it proves |
|---|---|
| uses a database whose name ends with `_test` | The database that answered has a test name and is not `studycircle`. |
| has both partial unique indexes | `pg_indexes` lists `group_members_one_active_leader_per_group` and `join_requests_one_pending_per_user_group`. A missing index fails loudly. |
| cleans tables and restarts ids | After `cleanDatabase`, a table is empty, and the next new row gets id 1. |

**3. Verify.** Run these from `backend/`:

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | Prints nothing |
| Build | `npm run build` | No errors |
| Unit tests | `npm test` | 38 tests pass in 5 suites |
| E2E tests | `npm run test:e2e` | The line `preparing the database "studycircle_test"`, Prisma lines that name `studycircle_test`, and 4 tests pass in 2 suites |
| Guard stop | Set `$env:TEST_DATABASE_URL` to a fake link whose database name is `studycircle`, then run `npm run test:e2e` | The run stops in the global setup with the "does not end with" message, and no migrate output appears |

After the guard stop check, clear the variable, or every later run is refused:

```powershell
Remove-Item Env:TEST_DATABASE_URL
```

Then check the databases in DBeaver:

| Database | Query | Expected |
|---|---|---|
| `studycircle_test` | `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';` | `18` (17 tables plus `_prisma_migrations`) |
| `studycircle_test` | `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;` | 2 migrations, both with a `finished_at` date |
| `studycircle` | `SELECT COUNT(*) FROM users;` | `31`, which proves the tests never touched the development data |

Also run `git status` from the repository root. It must not show `.env`, `node_modules/`, or anything in `src/generated/`.

**Known gap.** E2E tests build the app from `AppModule` and skip `main.ts`. So the `/api/v1` prefix, the global pipes, the interceptor, and the filter are not active in tests yet. Decide how to share that setup when the first real route test is written.

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

## Final Folder Structure (After Seed Script) (ADDED)

This shows only what is **new or changed** after Part 4. Everything else stays as in the trees above.

```text
backend/
├── .env.example                      (CHANGED: SEED_ADMIN_PASSWORD added)
├── package.json                      (CHANGED: seed script, tsx, bcrypt, @types/bcrypt, allowScripts)
├── prisma.config.ts                  (CHANGED: migrations.seed)
└── prisma/
    ├── seed.ts                       (entry file: guards, wipe, seed steps, checks, counts)
    └── seed/
        ├── client.ts                 (the seed's own Prisma client)
        ├── data.ts                   (fake word lists and settings)
        ├── guards.ts                 (production, local-host, and password checks)
        ├── random.ts                 (repeatable random numbers)
        ├── reset.ts                  (wipes all 17 tables)
        ├── seed-chat.ts              (messages and posts)
        ├── seed-groups.ts            (groups, members, join requests)
        ├── seed-lookups.ts           (levels, subjects, student interests)
        ├── seed-sessions.ts          (sessions, attendance, reviews)
        ├── seed-users.ts             (admin and students)
        └── verify.ts                 (rule checks after seeding)
```

## Final Folder Structure (After Test Database) (ADDED)

This shows only what is **new or changed** after Part 5. Everything else stays as in the trees above. `package.json` did not change.

```text
backend/
├── .env                              (CHANGED: TEST_DATABASE_URL added, NOT committed)
├── .env.example                      (CHANGED: TEST_DATABASE_URL added, fake value)
└── test/
    ├── app.e2e-spec.ts               (starter test, unchanged)
    ├── database-rules.e2e-spec.ts    (3 checks: test database name, both partial indexes, cleaner)
    ├── jest-e2e.json                 (CHANGED: globalSetup, setupFiles, maxWorkers)
    └── support/
        ├── clean-database.ts         (test client, real database name check, table cleaner)
        ├── global-setup.ts           (guard, then prisma migrate deploy on the test database)
        ├── guard.ts                  (refuses any link that is not a local test database)
        └── test-env.ts               (copies TEST_DATABASE_URL into DATABASE_URL)
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
| `npm run seed` says it cannot find `prisma/seed.ts` | The seed file does not exist yet, or the command runs from the wrong folder. | Run it from `backend/`. Check that `backend/prisma/seed.ts` exists. |
| `seed refused: NODE_ENV is "production"` | `NODE_ENV` is set to `production` in this terminal. | This is the guard working. In PowerShell run `Remove-Item Env:NODE_ENV` and run the seed again. |
| `seed refused: the database is not on this computer` | The host in `DATABASE_URL` is not `localhost`, `127.0.0.1`, or `[::1]`. | Check `backend/.env`. The seed only wipes a local database. Do not change the guard to get around it. |
| `seed refused: SEED_ADMIN_PASSWORD ...` (missing, placeholder, or too short) | The variable is not in `backend/.env`, still has the placeholder, or has fewer than 8 characters. | Add your own real password of at least 8 characters to `backend/.env`. |
| `seed verify failed:` followed by a list | A seed file broke a project rule, or the group plan changed without `EXPECTED_GROUPS` in `verify.ts`. | Read the list. Each line names the failed check. Fix the seed file, not the check. |
| `seed wipe failed: the users table is not empty` | The wipe command did not clear the table. | Check that the database user can run `TRUNCATE`, and that nothing else is writing to the database. |
| npm warns that the `esbuild` or `bcrypt` install script was blocked | npm 12 blocks install scripts that are not approved. | For `bcrypt`, run `npm install-scripts approve bcrypt`. Leave `esbuild` blocked unless `tsx` stops working. |
| Prisma prints an "Update available 7.10.1 -> 8.0.0" box | A newer Prisma pre-release exists. | Ignore it. Never run `npm i --save-dev prisma@latest`. See the rules at the end. |
| `Cannot find module '../../src/generated/prisma/client'` when the seed runs | The generated client does not exist yet. It is not committed. | Run `npx prisma generate` from `backend/`. |
| `test setup stopped: TEST_DATABASE_URL is missing` | The variable is not in `backend/.env`, or its name is misspelled. | Add it to `backend/.env`. See `backend/.env.example` and Step 29. |
| `test setup stopped: the database name "..." does not end with "_test"` | `TEST_DATABASE_URL` points to a database that is not a test database. | This is the guard working. Fix the link in `backend/.env`. Do not weaken the guard. |
| `test setup stopped: the test database must be on this computer (localhost)` | The host in `TEST_DATABASE_URL` is not `localhost`, `127.0.0.1`, or `[::1]`. | Check `backend/.env`. Tests wipe data, so they only run on a local database. |
| `test setup stopped: could not apply the migrations to the test database` | PostgreSQL is not running, `studycircle_test` does not exist, or the app user has no permission. | Read the output above that line. Check Step 28, including `GRANT ALL ON SCHEMA public` inside `studycircle_test`. |
| `permission denied for schema public` when the e2e tests start | The schema permission was not given inside `studycircle_test`. | Connect to `studycircle_test` as `postgres` and run `GRANT ALL ON SCHEMA public TO studycircle_user;`. |
| A test fails because a table or column is missing | A new migration arrived and the test database is behind. | Run `npm run test:e2e` again. The global setup applies pending migrations. |
| Tests pass alone but fail together, or one test sees data from another | Test files run at the same time on one database. | Keep `"maxWorkers": 1` in `jest-e2e.json`, and call `cleanDatabase()` in `beforeEach`. |
| Jest says it did not exit one second after the tests finished | A test left a database connection open. | Call `prisma.$disconnect()` in `afterAll`. |
| The "both partial unique indexes" test fails | An index is missing from `studycircle_test`. A migration was edited, or the database was built another way. | Never edit an applied migration. Check `pg_indexes`. Rebuild the test database from the migrations. |
| `ExperimentalWarning: VM Modules is an experimental feature` | The test scripts run Node with `--experimental-vm-modules`. | Ignore it. It is only a warning. |

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
| Run end-to-end tests (builds `studycircle_test` from the migrations first, then runs) | `npm run test:e2e` |
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
| Fill the development database with fake data (wipes it first) | `npm run seed` |
| Same, through Prisma | `npx prisma db seed` |
| Check types without building (also covers the seed files) | `npx tsc --noEmit` |
| Check the runtime packages for vulnerabilities | `npm audit --omit=dev` |
| Check both partial indexes in the test database (DBeaver, connected to `studycircle_test`) | `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%one_%';` |

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
- The seed deletes every row. It only runs against a local development database, and it refuses `NODE_ENV=production`. Never weaken or remove these guards.
- Never put a real person's data in the seed. All seed data is fake. Use the reserved `.test` email ending and `example.com` links.
- The seed has its own Prisma client in `prisma/seed/client.ts`. This is the only allowed exception to the single-connection rule. App code must never create another `PrismaClient`.
- Never put the real admin password in code or in `.env.example`. It lives only in `backend/.env` as `SEED_ADMIN_PASSWORD`.
- When the schema or the fixed values change, update the seed files in the same pull request, then run `npm run seed` and `npx tsc --noEmit`.
- When the group plan in `seed-groups.ts` changes, change `EXPECTED_GROUPS` in `verify.ts` too.
- Prisma 7 does not run the seed after `migrate dev` or `migrate reset`. Run `npm run seed` yourself.
- E2E tests use only `studycircle_test`, through `TEST_DATABASE_URL`. Never point it at the development database.
- The name of the test database must end with `_test`. Never weaken or remove the guard in `test/support/guard.ts`.
- The test database is built with `prisma migrate deploy` from the committed migrations. Never use `db push` for it, because it skips the two partial indexes.
- E2E test files run one at a time (`maxWorkers: 1`), and every test starts with `cleanDatabase()`.
- Never run the seed on the test database. Each test creates only the rows it needs.
- The test helpers have their own Prisma client in `test/support/clean-database.ts`. With the seed client, this is the second and last exception to the single-connection rule. App code must never create another `PrismaClient`.
- Never print `DATABASE_URL` or `TEST_DATABASE_URL`. Both contain the database password. Print only the database name.
- After pulling a new migration, run `npm run test:e2e`. The global setup applies it to the test database.
