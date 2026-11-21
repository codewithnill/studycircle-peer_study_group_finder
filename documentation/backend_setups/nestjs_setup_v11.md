# StudyCircle — Backend Setup (NestJS + Prisma + PostgreSQL)

**Last updated:** 21 November 2026

## What Changed in This Version

This version keeps everything from v10 (Steps 1 to 50). It adds Part 10 (Steps 51 to 56): the profile routes, with the first separate update DTO, a safe id pipe, 49 new unit tests, and 24 new e2e tests. The v10 changes (Part 9: the plain `429` message and the capital-letter auth messages) are still described in Part 9. A small fix on 21 November 2026 adds Step 57: `@CurrentUser()` now uses the shared login message.

| Type | What | Where in this file |
|---|---|---|
| ADDED | Part 10: the profile decisions (who sees a public profile, the public fields, the subject routes and the limit of 10, the year range 1 to 6, clearing fields, email and password change left out) | Part 10, Step 51 |
| ADDED | Part 10: shared field limits and text helpers for the register form and the profile form, and `MAX_INT_ID` | Part 10, Step 52 |
| ADDED | Part 10: `UpdateProfileDto`, `AddSubjectDto`, `ParseIdPipe`, the `@IsOptional()` trap, and the pipe order trap found by the e2e tests | Part 10, Step 53 |
| ADDED | Part 10: the profile service methods, the safe select lists and reply shapes, and the Serializable transaction for adding a subject | Part 10, Step 54 |
| ADDED | Part 10: `users.controller.ts` with five locked routes | Part 10, Step 55 |
| ADDED | Part 10: the new unit and e2e tests, the login helper, the Postman round 2, and the checks | Part 10, Step 56 |
| ADDED | Part 10: `@CurrentUser()` uses the shared `UNAUTHENTICATED_MESSAGE`, the guard uses a type-only import, a new decorator spec, and the dropped `auth.e2e-spec.ts` cleanup | Part 10, Step 57 |
| ADDED | Known limits of the profile routes | Part 10, end |
| REMOVED | Two known-limit rows (the lowercase decorator message, and the `auth.e2e-spec.ts` cookie helpers), because Step 57 settled both | Known Limits of the Profile Routes |
| ADDED | Folder tree after the profile routes | Final Folder Structure (After Profile Routes) |
| ADDED | Troubleshooting rows, cheat sheet rows, and rules for the profile routes | Troubleshooting, Quick Cheat Sheet, Rules to Never Forget |
| CHANGED | `register.dto.ts` now uses the shared limits and turns an empty `department` into `null` | Part 10, Step 52 |
| UPDATED | The unit test count is now 165 in 17 suites (it was 114 in 12, and 163 in 16 after Step 56). The e2e count is now 44 in 4 suites (it was 20 in 3) | Part 10, Steps 56 and 57 |
| UPDATED | The API shape file is now `studycircle_api_shape_v6.md` | Whole file |
| UPDATED | The "What This Setup Produces" table counts the new files | What This Setup Produces |

## What This Setup Produces

StudyCircle is a peer study group finder platform maintained as one monorepo. This setup creates the NestJS backend, connects it to PostgreSQL through Prisma, and reserves folders for the planned Next.js frontend and project documentation.

| Location | Purpose | Final state |
|---|---|---|
| `backend/` | NestJS and TypeScript backend | Scaffolded, installed, runnable, connected to PostgreSQL through Prisma, with the shared API layer, one shared app setup function, the auth layer, the profile routes, six feature modules, a seed script, and a test database setup for e2e tests |
| `backend/prisma/` | Prisma schema, migrations, and the seed script | 17 tables, 10 enums, 2 migrations, and `seed.ts` with 11 helper files in `seed/` |
| `backend/src/common/` | Shared fixed words, helpers, pipes, interceptor, and filter | 20 files that apply the API shape rules (15 from Part 3, and 5 from Part 10: `database-limits.ts`, the text helpers, and the safe id pipe, each with its spec where it has one) |
| `backend/src/app.setup.ts` | The shared app setup | One function, `configureApp()`, used by `main.ts` and the e2e tests |
| `backend/test/` | End-to-end tests and the test database setup | 1 app setup test file, 1 database check test file, 1 auth test file, 1 users test file, and 6 support files in `support/` |
| `frontend/` | Planned Next.js frontend with React 19, TypeScript, and Tailwind CSS | Empty placeholder folder |
| `documentation/` | Project documentation | Contains this setup reference |
| `.git/` | Monorepo Git metadata | At the repository root only |

The backend data layer is PostgreSQL with Prisma ORM. Jest is included for tests. Unit tests need no database. E2E tests use a separate test database called `studycircle_test`. Every reply follows the API shape rules in `studycircle_api_shape_v6.md`. The four team areas are Auth & User Profiles; Groups & Search; Requests, Members & Chat; and Scheduling, Notes & Admin Panel.

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
| `@nestjs/jwt` | `^12.0.5` |
| `@nestjs/throttler` | `^6.7.1` (`6.6.0` or newer is needed for Nest 12) |
| `cookie-parser` | `^1.4.7` |
| `@types/cookie-parser` | `^1.4.10` (dev only) |
| `supertest` | `^7.0.0` (dev only, from the scaffold) |
| `@types/supertest` | `^7.0.0` (dev only, from the scaffold) |

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

**The second ignore file, `backend/.gitignore`.** The scaffold and `prisma init` also wrote a small `backend/.gitignore`. After Part 8 (Step 44) it blocks these paths. A leading `/` ties a rule to the `backend/` folder only.

| Rule | What it blocks |
|---|---|
| `node_modules` | The installed packages |
| `.env` | The real environment file |
| `/generated/prisma` | An old Prisma output folder outside `src/`. It is not used, but the rule stays as a guard. |
| `/.agents/`, `/.claude/`, `/.windsurf/` | Prisma's helper skill folders for AI coding tools |
| `/skills-lock.json` | The list of installed skills |

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

The schema itself (every table and column) is described in `studycircle_database_schema_mvp_v4.md`. The exact enum words are in `studycircle_fixed_values.md`. This part only explains how the database and Prisma are set up.

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
| `backend/src/main.ts` | Calls `app.enableShutdownHooks()` so `onModuleDestroy` runs when the server stops. Then the database connection closes cleanly. This line stays in `main.ts` after Part 8, because only a real running server gets a stop signal. |

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

**What problem this solves:** four students write routes at the same time. Without shared rules, each route would reply in its own shape, and one route could leak a database detail in an error. The shared layer makes every reply follow `studycircle_api_shape_v6.md`, so the frontend reads every reply the same way. It also creates the six feature folders, so each person works in a separate place.

> **Status (12 November 2026):** the code in this part is written and the Step 21 checks passed. The build has no errors, 38 unit tests pass (5 suites), the server starts with `Found 0 errors`, and the `/api/v1` reply and the 404 error shape were checked on the running server. One fix was needed: the folder `src/common/Pipes` had a capital letter and was renamed to `pipes` (see Troubleshooting). Most checks that needed a real route are now covered by the auth e2e tests (Part 8). The partial index check is still open (see the end of Step 21).

The rules for every reply are in `studycircle_api_shape_v6.md`. If the code and that file disagree, that file wins.

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

The filter checks the error's name (`PrismaClientKnownRequestError`) and its code. It imports nothing from Prisma. Since Part 9 (Step 49), the filter also gives every `429` the plain sentence `Too many requests. Please try again later`. A service should still catch the cases it knows well (for example a second pending join request) and give an exact message.

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

> **Update (Part 8, Step 45):** these lines moved out of `main.ts` into the `configureApp()` function in `backend/src/app.setup.ts`. `main.ts` now calls `configureApp(app)`, and the e2e tests call the same function. The lines and their order did not change. `app.enableShutdownHooks()` stays in `main.ts`. The text below shows the original step.

`backend/src/main.ts` switches everything on. The new lines come after `NestFactory.create(AppModule)` and before `app.listen(...)`:

```typescript
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new SnakeToCamelPipe(), createValidationPipe());
app.useGlobalInterceptors(new ResponseInterceptor());
app.useGlobalFilters(new AllExceptionsFilter());
app.enableShutdownHooks();
```

Notes:
1. The prefix is set only in one place. Since Part 8, that place is `configureApp()` in `src/app.setup.ts`. Controllers never repeat it.
2. The order of the two pipes matters. The snake-to-camel pipe must run first, because the DTO rules expect camelCase names.
3. After this step, the starter route moves from `http://localhost:3000/` to `http://localhost:3000/api/v1`.
4. CORS and the cookie reader are added together with login in Part 7 (Step 42).

## Step 21 — Verify the Shared API Layer

Run these checks:

- `npm run build` (in `backend/`) finishes with no errors.
- `npm test` passes, including the four new spec files (38 tests in 5 suites when checked on 12 November 2026).
- `npm run start:dev` shows `Found 0 errors`.
- `http://localhost:3000/api/v1` shows `{"data":"Hello World!"}`.
- `http://localhost:3000/` shows Express's plain "Cannot GET /" page with a 404 status. It is not the JSON error shape (see Step 6).
- `http://localhost:3000/api/v1/unknown` shows a 404 in the error shape (`status_code`, `message`, and an empty `errors` list).
- `git status` does not show `.env`, `node_modules/`, `dist/`, or anything in `src/generated/`.

Checks that need a real route:
- Send a body with a snake_case key. It must reach the code as camelCase and be validated. **Done:** the auth e2e test sends `academic_year` on register (Step 47).
- Send a body with a field that the DTO does not list. It must give a 400 with an `errors` item. **Done:** the auth e2e test sends `role` on register (Step 47).
- Break each of the two partial indexes (a second pending join request, a second active leader) with a real request. Check which database code comes back. The map above expects `P2002` and a 409 reply. **Still open:** it needs the join request and leadership routes (week 5).

---

# Part 4 — Seed Script (ADDED)

**What problem this solves:** the database is empty and no routes exist yet. Search, pagination, and the group pages cannot be tested on an empty database. The seed script fills it with fake demo data in one command, and it resets to a clean state in one command. It also makes the demo look alive, which is a Must in the 3-month plan.

> **Status (13 November 2026):** the seed script is written and checked. `npx tsc --noEmit` and `npm run build` pass with no errors. `npm run seed` passes 29 rule checks and prints the same counts on every run. Running it with `NODE_ENV` set to `production` is refused before anything is deleted. `group_files` rows are not seeded yet (see the end of Step 26).

The fixed words (statuses, modes, roles) come from `studycircle_fixed_values.md`. The tables come from `studycircle_database_schema_mvp_v4.md`. The seed uses the same words.

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

The full `npm audit` lists 20 findings (4 low and 16 moderate, none high) after the review in Part 6. It listed 26 before that review. They are all in development tools. **Never run `npm audit fix --force`.** Read Step 34 before you change anything.

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

**Not seeded yet:** `group_files`, `refresh_tokens`, `notifications`, `reports`, and `admin_actions`. The `group_files` rows need real files on disk. The team decided that files are saved on the server disk behind one small file service. That service is built in week 7, so these rows are added then. The other four fill up when their features are built. Update the seed in week 11.

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

**1. `backend/test/jest-e2e.json`.** Add three keys next to the scaffold keys. (Part 8, Step 47 adds a fourth key, `testTimeout`.)

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
| Unit tests | `npm test` | 38 tests pass in 5 suites (111 in 12 after Part 7) |
| E2E tests | `npm run test:e2e` | The line `preparing the database "studycircle_test"`, Prisma lines that name `studycircle_test`, and 4 tests pass in 2 suites (20 in 3 after Part 8) |
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
| `studycircle` | `SELECT COUNT(*) FROM users;` | Not `0`. It is `31` right after a fresh seed, and higher after manual Postman tests that register accounts (it was `33` on 19 November 2026). A count that is not `0` proves the tests never touched the development data. |

Also run `git status` from the repository root. It must not show `.env`, `node_modules/`, or anything in `src/generated/`.

**Known gap (solved in Part 8).** E2E tests used to build the app from `AppModule` and skip `main.ts`, so the `/api/v1` prefix, the global pipes, the interceptor, the filter, the cookie reader, and CORS were not active in tests. The team chose one shared setup function (option a). Since Part 8, `main.ts` and the e2e tests both call `configureApp()` from `src/app.setup.ts`, and every e2e test builds its app with `createTestApp()`. See Steps 45 and 46.

# Part 6 — Dependency Audit Review (ADDED)

**What problem this solves:** npm warns about vulnerabilities after almost every install. A teacher or a recruiter who runs `npm audit` on the repository should see a clear, explained result, not a scary number. This review also stops the wrong "fixes" that npm suggests, which can break the project.

> **Status (14 November 2026):** the review is done. The runtime audit shows 0 findings. The full audit went from 26 findings to 20 (4 low, 16 moderate, none high). After each change, the type check, the build, the 38 unit tests, and the 4 e2e tests all passed. The work was saved in two commits.

**Part 6 did not change `tsconfig.json`, `prisma.config.ts`, the schema, any migration, or any source file.** In `package.json`, one line was removed. `package-lock.json` changed too.

## Step 34 — Review and Reduce the Dependency Audit

**What the report showed at the start**

| Group of findings | Severity | Where it came from | Real risk |
|---|---|---|---|
| `tmp` and `undici` (about 20 advisories) | high | Only the `@nestjs/mau` package | Low. It is a development tool, and the live app never loads it. |
| `deepmerge`, `glob`, `minimatch`, and about 20 packages that depend on them | low and moderate | The Jest test tools, and the Nest CLI | Low. They run only on a developer computer during tests and builds. |

`@nestjs/mau` is the command-line tool for deploying a NestJS app with Mau, the official Nest platform for AWS. The project did not use it, so it was removed. If Mau is ever needed, its own instructions install it globally, outside the project.

**Results after each change**

| Moment | Runtime audit (`--omit=dev`) | Full audit |
|---|---|---|
| Start | 0 | 26 (6 low, 18 moderate, 2 high) |
| After removing `@nestjs/mau` | 0 | 21 (4 low, 17 moderate, 0 high) |
| After the safe `npm audit fix` | 0 | 20 (4 low, 16 moderate, 0 high) |

**The steps, in order.** Run every command from the `backend/` folder, one at a time.

1. Check the packages that run in the live app. It must say `found 0 vulnerabilities`:

```bash
npm audit --omit=dev
```

2. See the full list, and sort it into runtime and development-only:

```bash
npm audit
```

3. Find out which package needs the package in question. For `@nestjs/mau`, it showed one direct line under `backend`, so the project itself listed it:

```bash
npm ls @nestjs/mau
```

4. Preview the safe fix. This command changes nothing:

```bash
npm audit fix --dry-run
```

5. Remove the unused package:

```bash
npm uninstall @nestjs/mau
```

6. Check the `package.json` diff. It must show only one removed line, the `@nestjs/mau` line, and nothing else:

```bash
git --no-pager diff package.json
```

7. Run the four checks: `npx tsc --noEmit`, `npm run build`, `npm test`, and `npm run test:e2e`. All must pass. Commit `package.json` and `package-lock.json` together.

8. Apply the safe fix. It changed only `package-lock.json`, so `git diff package.json` printed nothing:

```bash
npm audit fix
```

9. Run the four checks again. Then run `git status`. Only `package-lock.json` should be changed. Commit that one file.

**Why `--force` stays forbidden.** The "fixes" that npm offered for the remaining findings were `jest@25.1.0` and `@nestjs/mau@0.0.6`. Jest 25 is five major versions older than the Jest 30 this project uses, and `@nestjs/mau@0.0.6` was older than the installed `0.2.9`. Both are downgrades that npm lists as fixes. They would break the tests.

**Questions to ask about every finding**

1. Is the package a runtime package or a development tool? The runtime audit answers this. Development tools are low priority.
2. Does a fix exist inside the same major version? If yes, take it with the plain `npm audit fix`, and read the `package.json` diff first.
3. Does the fix need a new major version of NestJS, Jest, or Prisma, or a downgrade? Then do **not** take it. Write it down instead.
4. Is the package used at all? An unused package should be removed, not fixed.

**What stays, and why.** The 20 remaining findings are all in the Jest tool chain (`deepmerge`, `glob`, `minimatch`). The only fix npm offers is a breaking downgrade of Jest. They stay until the Jest team releases a patched version. Run the audit again before submission, and after every big install, because the numbers change over time.

**Text for the README, under "Known issues":**

```text
Known issues: npm audit reports 20 low and moderate findings, all in the Jest test tool chain (deepmerge, glob, minimatch). They are development-only and never run in the live app (npm audit --omit=dev reports 0). The only available fix is a breaking downgrade to Jest 25, so they are kept until Jest ships a patched version.
```

---

# Part 7 — Backend Authentication (ADDED)

**What problem this solves:** a study group platform is only safe when the server knows who is calling. Without login, anyone could join a group, read private chat, or pretend to be a leader. This part adds sign-up, login, logout, and a lock on every route, so the later group, chat, and admin features can trust "who is this person".

> **Status (17 November 2026):** the code in this part is written, committed, and checked. `npx tsc --noEmit` is clean and `npm run build` has no errors. `npm test` passes 111 tests in 12 suites (it was 38). `npm run test:e2e` passes 4 tests in 2 suites. The rate limit was tested by hand (5 wrong logins give `401`, then `429` with a `Retry-After` header). A Postman and DBeaver round of 19 screenshots is saved in `screenshots/postman_manual_api_testing/` at the repository root. The open item at that time (the e2e tests skipped `main.ts`) is solved in Part 8, and the auth routes now have 15 e2e tests (20 e2e tests in 3 suites in total).

**Part 7 did not change `tsconfig.json`, `prisma.config.ts`, the schema, or any migration.** Passport is **not** used. The login check is a small custom guard, so there is one less package to learn and audit.

**The decisions this part is built on:**

| Decision | What it means |
|---|---|
| Register creates the account only | It sets **no** cookies. The frontend calls login next. |
| Tokens live only in HttpOnly cookies | The JSON reply never contains a token. JavaScript in the page cannot read the cookies. |
| After login, the reply is the person's own data | It includes the person's own `email`. No other reply may ever include an email that belongs to someone else. |
| One general `401` message for every login failure | The reply never says whether the email or the password was wrong. An unknown email still runs a bcrypt compare on a dummy hash, so the timing does not give it away. |
| A cancelled refresh token used again cancels **all** refresh tokens of that user | A reused token means a token may have been stolen. The person must log in again. |
| The guard reads the user from the database on every request | A suspension or a deleted account works at once. The role also comes from the database, not from the token. |
| Logout is a public route | It works even after the access token has expired, so a person can always log out. |
| No schema change | The `refresh_tokens` table from v4 of the schema was enough. |

## Step 35 — Install the Auth Packages

Run these commands from the `backend/` folder, one at a time.

```bash
npm install @nestjs/jwt @nestjs/throttler cookie-parser
```

```bash
npm install --save-dev @types/cookie-parser
```

| Package | Plain-English job |
|---|---|
| `@nestjs/jwt` (`^12.0.5`) | Makes and checks the short login token (JWT). |
| `@nestjs/throttler` (`^6.7.1`) | Rate limits. It counts calls per address and answers `429` when a limit is passed. Version `6.6.0` or newer is needed for Nest 12. |
| `cookie-parser` | Lets Express read cookies from the incoming request. Express does not do this by itself. |
| `@types/cookie-parser` | Gives TypeScript the types for `cookie-parser`. Development only. |

Before the commit, check the `package.json` diff (`git --no-pager diff package.json`). It must show only added lines, and no scaffold package may be missing. Commit `package.json` and `package-lock.json` together. Then run `npm audit --omit=dev`. It must still say `found 0 vulnerabilities`.

## Step 36 — Add the Auth Environment Variables

Add two variables to `backend/.env.example` (committed, fake values) and to `backend/.env` (never committed, real values).

```text
# Secret used to sign login tokens. At least 32 characters. Choose your own value in backend/.env.
JWT_ACCESS_SECRET="change_me_at_least_32_characters_long"
# The one web address that may call the API from a browser. In development, the Next.js frontend.
FRONTEND_URL="http://localhost:3001"
```

To make a strong secret for `backend/.env`, run this from `backend/` and copy the printed text into `.env` yourself. Never paste it into chat, Git, or a screenshot:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Both variables are checked at start-up. The app **refuses to start** when `JWT_ACCESS_SECRET` is missing or shorter than 32 characters, and when `FRONTEND_URL` is missing. A loud failure at start is safer than a silent weak setup. Since Part 8, the `FRONTEND_URL` check lives in `configureApp()`, so the e2e tests refuse to start without it too.

## Step 37 — Add the Users Service, Constants, and DTOs

| File | Job |
|---|---|
| `src/users/users.service.ts` (+ spec) | Finds and creates users through Prisma. Other modules reach users only through this service. |
| `src/users/users.module.ts` | Provides and exports `UsersService`, so `AuthModule` can import it. |
| `src/auth/auth.constants.ts` | The shared numbers and names for auth (cookie names, lifetimes). One place, so nothing is typed twice. |
| `src/auth/dto/register.dto.ts` | The allowed input for register. The password must be at least 8 characters. Unknown fields (like `role`) are refused with `400`. |
| `src/auth/dto/login.dto.ts` | The allowed input for login. |

The register DTO does not list `role`, so nobody can choose to become an admin. The `ValidationPipe` from Step 18 refuses the extra field. This was checked in Postman (screenshot 03) and by an e2e test (Step 47).

## Step 38 — Add the Token Service

The file is `src/auth/token.service.ts` (+ spec). It handles the two kinds of tokens.

| Token | How it is made | Where it lives |
|---|---|---|
| Access token (JWT) | Signed with HS256 using `JWT_ACCESS_SECRET`. Lives 15 minutes. The payload holds only `sub` (the user id) and `role`. | The `access_token` cookie |
| Refresh token | 48 random bytes, written as base64url text. Lives 7 days. | The `refresh_token` cookie |

The database stores only a **SHA-256 hash** of the refresh token (`refresh_tokens.token_hash`, 64 hex characters). A stolen database cannot be used to log in. A fast hash is fine here, because the token is long and random. Passwords are different: they are short and guessable, so they use bcrypt, which is slow on purpose.

The service refuses to start when `JWT_ACCESS_SECRET` is missing or under 32 characters.

## Step 39 — Add the Auth Service

The file is `src/auth/auth.service.ts` (+ spec).

| Method | What it does |
|---|---|
| `register` | Hashes the password with bcrypt and creates the user with the role `student`. Sets no cookies. A duplicate email gives `409`. |
| `login` | Finds the user, compares the password, refuses a suspended or deleted account, makes both tokens, and saves the refresh token hash. Every failure gives the same `401` message. |
| `refresh` | Checks the refresh token, **cancels it, and makes a new pair, all in one database transaction** (this is called rotation). A token that is already cancelled cancels every refresh token of that user, then gives `401`. |
| `logout` | Cancels the refresh token (fills `revoked_at`). |

Why rotation: a refresh token works only once. If a thief and the real person both use the same token, the second use is noticed, and every token of that person is cancelled.

## Step 40 — Add the Cookie Helper and the Controller

| File | Job |
|---|---|
| `src/auth/auth-cookies.ts` (+ spec) | Sets and clears the two cookies, so no other file touches cookie settings. |
| `src/auth/auth.controller.ts` (+ spec) | The five routes below. It is thin: it reads the DTO, calls the service, and sets cookies. |

**The two cookies:**

| Cookie | Path | Lifetime | Flags |
|---|---|---|---|
| `access_token` | `/` | 15 minutes | HttpOnly, SameSite `lax`, Secure only when `NODE_ENV` is `production` |
| `refresh_token` | `/api/v1/auth` | 7 days | HttpOnly, SameSite `lax`, Secure only when `NODE_ENV` is `production` |

The refresh cookie has a narrow path, so the browser sends it only to the auth routes, never to every request.

**The routes** (all start with `/api/v1`):

| Route | Public | Success reply | Limit per minute |
|---|---|---|---|
| `POST /auth/register` | Yes | `201`, safe fields only (no email, no `password_hash`) | 5 |
| `POST /auth/login` | Yes | `200`, the person's own data. Two cookies are set. | 5 |
| `POST /auth/refresh` | Yes (it uses the refresh cookie) | `200` with `{ "data": null }`. Two new cookies are set. | 20 |
| `POST /auth/logout` | Yes (on purpose, so logout works after the access token has expired) | `200` with `{ "data": null }`. Both cookies are cleared. | default (100) |
| `GET /auth/me` | No | `200`, the person's own data | default (100) |

## Step 41 — Add the Guards and Decorators

| File | Job |
|---|---|
| `src/auth/decorators/` (three files) | `@Public()` opens a route to everyone. `@Roles(...)` lists the roles that may call a route. `@CurrentUser()` gives a controller the logged-in user. |
| `src/auth/guards/jwt-auth.guard.ts` (+ spec) | Reads the `access_token` cookie, checks it, loads the user from the database, and refuses a suspended or deleted account. |
| `src/auth/guards/roles.guard.ts` (+ spec) | Checks the role from `@Roles(...)`. The role is the one read from the database. |
| `src/auth/auth.module.ts` | Imports `JwtModule.register({})` and `UsersModule`. Registers the three guards as **global guards** with `APP_GUARD`, in this order: `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`. |

**Locked by default:** because the guards are global, every route needs a login unless it has `@Public()`. A new route that a developer forgets to protect is safe, not open. A route that must be open has to say so on purpose.

The suspended-account answer is the same `401` as "not logged in", on purpose, so a stranger cannot tell the two cases apart. `studycircle_api_shape_v6.md` (Section 6) lists it under `401` too.

The guards come from `AuthModule` through `APP_GUARD`, not from `main.ts`. So they were active in the e2e tests even before Part 8.

## Step 42 — Wire Everything in app.module.ts, app.controller.ts, and main.ts

**`src/app.module.ts`:** import the rate limit module.

```typescript
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])
```

This sets the default: 100 calls per minute per address. The auth routes set their own lower limits.

**`src/app.controller.ts`:** add `@Public()` to the starter route, so `GET /api/v1` stays open (it is the quick "is the server up" check).

**`src/main.ts`** (since Part 8, these lines live in `configureApp()` in `src/app.setup.ts`):
1. Add `cookie-parser`, so cookies can be read.
2. Add CORS that allows **only** `FRONTEND_URL`, with `credentials: true`. Browsers refuse to send cookies to a different address unless the server says so.
3. Refuse to start when `FRONTEND_URL` is missing.

The pipe order from Step 20 does not change: the snake-to-camel pipe first, then the validation pipe.

## Step 43 — Verify the Auth Layer

**Automatic checks.** Run from `backend/`:

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | Prints nothing |
| Build | `npm run build` | No errors |
| Unit tests | `npm test` | 111 tests pass in 12 suites |
| E2E tests | `npm run test:e2e` | 4 tests pass in 2 suites at the end of Part 7. 20 tests pass in 3 suites after Part 8. |
| Runtime audit | `npm audit --omit=dev` | `found 0 vulnerabilities` |

**Quick curl checks** with the server running (use `curl.exe` in PowerShell):

| Request | Expected |
|---|---|
| `GET /api/v1` | `200` (open route) |
| `GET /api/v1/auth/me` | `401` (locked by default) |

**The Postman and DBeaver round.** Screenshots are saved in `screenshots/postman_manual_api_testing/` at the repository root. Never show real cookie token values, `.env`, or a real password in a screenshot. The demo passwords `Postman@123` and `Student@12345` are throwaway values and are safe to show.

| # | Test | Expected |
|---|---|---|
| 01 | Register a new account | `201`, safe fields only |
| 02 | Register the same email again | `409` |
| 03 | Register with an extra `role` field | `400`, `property role should not exist` |
| 04 | Register with a 5-character password | `400`, the password must be at least 8 characters |
| 05 | Login with a wrong password | `401`, `Email or password is not correct` (the screenshot shows the old lowercase text) |
| 06 | Login with an unknown email | The same `401` as test 05 |
| 07 | Login success | `200`, own data, no tokens in the JSON |
| 08 | `GET /auth/me` while logged in | `200`, own data |
| 09 | Refresh | `200`, `{ "data": null }` |
| 10 | Refresh with the old (used) cookie | `401`, all refresh tokens of that user are cancelled |
| 11 | Logout | `200`, `{ "data": null }`, cookies gone |
| 12 | `GET /auth/me` after logout | `401` |
| 13 | Refresh with the cancelled cookie | `401` |
| 14 | Login as the seed student | `200` (seed accounts work with the real login code) |
| 15 | `GET /auth/me` after the account is suspended | `401` at once |
| 16 | Login with the suspended account | The same general `401` |
| 17 | DBeaver: refresh token hashes | 64 characters, hex, cancelled rows flagged |
| 18 | DBeaver: password hashes | bcrypt, 60 characters |
| 19 | Six wrong logins in a minute | `401` five times, then `429` with `Retry-After: 60`. Since Part 9 the message is `Too many requests. Please try again later` (the screenshot shows the old `ThrottlerException` text). |

For tests 15 and 16, suspend and restore the account in DBeaver (connected to `studycircle`). Always restore it, because the demo uses it:

```sql
UPDATE users SET status = 'suspended' WHERE email = 'student01@studycircle.test';
```

```sql
UPDATE users SET status = 'active' WHERE email = 'student01@studycircle.test';
```

For test 17, this query shows the hash length and the revoked flag, and it never selects the hash itself:

```sql
SELECT id, user_id, length(token_hash) AS hash_length, token_hash ~ '^[0-9a-f]{64}$' AS is_64_hex, revoked_at IS NOT NULL AS is_revoked, expires_at, created_at FROM refresh_tokens ORDER BY id DESC LIMIT 10;
```

For test 18, this query shows only the start of the hash:

```sql
SELECT id, email, left(password_hash, 4) AS hash_start, length(password_hash) AS hash_length, password_hash LIKE '$2b$%' AS is_bcrypt FROM users WHERE email IN ('postman01@studycircle.test', 'student01@studycircle.test') ORDER BY id;
```

If `postman01` already exists, the first register gives `409`. Either continue from the duplicate test, or delete the row in DBeaver (its refresh tokens are deleted with it, because that foreign key uses `Cascade`):

```sql
DELETE FROM users WHERE email = 'postman01@studycircle.test';
```

Login and register allow 5 calls per minute. When a call gives `429`, wait 60 seconds.

The 19 screenshots were taken on 17 November 2026, before Part 9. They show the old lowercase messages and the old `429` text. They still prove the same behaviour. Take new ones only if a screenshot is used in the report.

Last, run `git status` from the repository root. It must not show `.env`, `node_modules/`, `dist/`, or anything in `src/generated/`. Also check that no reply contains the email or `password_hash` of another person.

## Known Limits of the Auth Layer (No Code Change Now)

These are known and accepted for the MVP. Write the important ones in the README.

| Limit | Plain-English explanation |
|---|---|
| Password length counts characters, but bcrypt reads only 72 bytes | A long password with many non-English characters can pass the DTO and still be cut by bcrypt. |
| `users.email` is unique across deleted rows too | A deleted person cannot register again with the same email. This needs a later schema change. |
| Register tells a stranger whether an email has an account | A usable sign-up form needs to say "This email is already registered". The rate limit slows guessing. |
| Old and expired rows pile up in `refresh_tokens` | A cleanup job is a later item. |
| No index on `refresh_tokens.user_id` | Add one if the table grows. |
| Rate limit counts are in memory | They reset when the server restarts, and they are not shared between servers. |
| The rate limit counts by address (IP) | A whole classroom behind one campus address shares one count. Raise the login limit to 10 per minute before a classroom demo. |
| After logout, the old access token stays valid until it expires (up to 15 minutes) | Logout cancels only the refresh token and tells the browser to delete both cookies. A real browser then has no cookie, so `/auth/me` gives `401`. But a copy of the access token made before logout still works until it expires, because the guard checks only the signature, the expiry, and the account status. This is the normal trade-off of short JWTs. A fix (a token deny-list or a token version number on the user) is a later item. The e2e logout test checks what a browser does and does not claim the old token is dead. |

**Deployment notes:**
1. Set `NODE_ENV=production`, so the cookies get the `Secure` flag.
2. Behind a proxy or a load balancer, set Express `trust proxy`. Without it, every caller looks like the same address and shares one rate limit count.
3. If the frontend is ever on a different **site** than the API (not just a different port), `SameSite=lax` blocks the cookie on `POST` calls. Then use `SameSite=none` with `Secure`, or put both on one shared domain.

**Chat note (weeks 6 and 7):** the global guards are built for HTTP. A WebSocket call has no cookies object in the same place, so the login guard would answer `401`. The throttler docs also say not to use its guard through `APP_GUARD` for WebSockets. The chat gateway needs its **own** login check on connect and on every message, and its own message rate limit.

---

# Part 8 — Housekeeping, Shared App Setup, and Auth E2E Tests (ADDED)

**What problem this solves:** the auth routes are the front door of StudyCircle. Until this part, the e2e tests built a bare app that skipped `main.ts`, so they did not check the app that students really use: no `/api/v1` prefix, no key change, no `data` wrapper, no error shape, and no cookie reader. A test could pass for the wrong reason. This part makes the tests use the exact same setup as the real server, then adds 15 tests that prove from the outside that students can sign up and stay logged in safely. It also cleans up two leftovers in the repository before more commits pile on top of them.

> **Status (19 November 2026):** the work in this part is written, committed, and checked. `npx tsc --noEmit` prints nothing and `npm run build` has no errors. `npm test` passes 111 tests in 12 suites. `npm run test:e2e` passes 20 tests in 3 suites, and the output names `studycircle_test`. `npm run start:dev` still works, and `GET http://localhost:3000/api/v1` still gives `{"data":"Hello World!"}`. The development database kept its demo data (33 users: the 31 from the seed plus 2 accounts registered by hand in the Postman round). `git status` shows no `.env`, `node_modules`, `dist`, `src/generated`, or the old `backend/generated` folder. The work was saved in three commits.

**Part 8 did not change `tsconfig.json`, `prisma.config.ts`, the schema, any migration, `package.json`, or `package-lock.json`.** No new packages were installed. `supertest` and `@types/supertest` were already in the scaffold.

## Step 44 — Housekeeping Check

Three small checks, all run from `backend/`.

**1. The old Prisma folder outside `src/`.** The folder `backend/generated/prisma/` was an old copy of the Prisma client. The real client is `backend/src/generated/prisma/`, because `schema.prisma` has `output = "../src/generated/prisma"`.

Search every code and config file for an import of either folder. The first command searches `src`, `prisma`, and `test` and skips the real client. The second searches only the config files at the top of `backend/`, without going into `node_modules`:

```powershell
Get-ChildItem -Path src, prisma, test -Recurse -File | Where-Object { $_.FullName -notmatch '\\src\\generated\\' } | Select-String -Pattern 'generated/prisma' -SimpleMatch
```

```powershell
Select-String -Path *.json, *.ts -Pattern 'generated/prisma' -SimpleMatch
```

How to read each line: a relative path counts from the file's own folder. All 26 lines pointed to `src/generated`. For example, `src/auth/guards/` uses `../../generated/prisma`, and two steps up from `guards` is still `src/`. The second command printed nothing. So nothing used the outer folder.

Then check whether Git tracks the folder (it printed nothing, so it was only on the disk) and which rule hides it:

```powershell
git ls-files generated
```

```powershell
git check-ignore -v generated/prisma
```

The second command printed `backend/.gitignore:5:/generated/prisma`. A rule already blocked the folder, so no new rule was needed. The rule stays as a guard. Delete the folder, then check the result. `Test-Path` must print `False` for the old folder and `True` for the real client:

```powershell
Remove-Item -Recurse -Force .\generated
```

```powershell
Test-Path .\generated, .\src\generated\prisma
```

**2. The Prisma skill folders.** `backend/.agents/skills`, `backend/.claude/skills`, and `backend/.windsurf/skills` hold the same Prisma tips for AI coding tools (Codex and Cursor, Claude Code, and Windsurf). `backend/skills-lock.json` lists what was installed and where it came from. The `npx skills add` tool writes one copy per tool. They are not app code: NestJS, the build, and the tests never read them.

| Choice | Result |
|---|---|
| A. Keep them in Git | The same text three times in the repo, and large diffs on every Prisma update |
| **B. Ignore them (chosen)** | The repo holds only app code and docs. On a new machine the skills are installed again by hand. |
| C. Commit only the lock file | Unclear value, because the tool cannot yet rebuild the folders from the lock file alone |

Git did not track any of them (`git ls-files .agents .claude .windsurf skills-lock.json` printed nothing). `prisma init` had already added unanchored rules for them under `# AI Tooling generated by Prisma`. Those lines were replaced by one anchored, commented set, so each path has one rule. The final `backend/.gitignore`:

```gitignore
node_modules
# Keep environment variables out of version control
.env

/generated/prisma

# ai helper skill folders.
# these hold prisma's tips for ai coding tools (claude code, windsurf, codex, cursor).
# they are not app code, so nestjs, the build and the tests never read them.
# the "npx skills add" tool writes the same text into three folders, which would only clutter the repo.
# the leading "/" ties each rule to the backend/ folder, so a folder with the same name deeper inside is not affected.
# safety: .claude/ can also hold personal files such as settings.local.json, which must never be committed.
/.agents/
/.claude/
/.windsurf/

# the list of installed skills and their sources.
# it is ignored too, because the folders above are not kept in git anyway.
/skills-lock.json
```

Check it. All four paths must print a line from `backend/.gitignore`:

```powershell
git check-ignore -v .agents .claude .windsurf skills-lock.json
```

**3. Tracked files.** Check which rule ignores each key path, and that `.env` and the build cache were never committed. The second command must print nothing:

```powershell
git check-ignore -v .env tsconfig.build.tsbuildinfo dist node_modules src/generated coverage/
```

```powershell
git ls-files .env tsconfig.build.tsbuildinfo
```

| Path | Ignored by |
|---|---|
| `.env` | `backend/.gitignore` |
| `node_modules` | `backend/.gitignore` |
| `tsconfig.build.tsbuildinfo` | root `.gitignore` (`*.tsbuildinfo`) |
| `dist` | root `.gitignore` |
| `src/generated` | root `.gitignore` (`backend/src/generated/`) |
| `coverage/` | root `.gitignore` |

Note: a rule with a trailing `/` (like `coverage/`) matches only a folder. If the folder does not exist yet, ask with a trailing `/` (`coverage/`), or Git treats the name as a file and prints nothing.

Commit: `backend/.gitignore` only.

## Step 45 — Share the App Setup

**The problem.** An e2e test builds the app with `Test.createTestingModule({ imports: [AppModule] })` and `createNestApplication()`. That skips `main.ts`, so every line there was missing in tests:

| Setup line | What a test missed without it |
|---|---|
| `FRONTEND_URL` check | (only a start-up check) |
| `cookieParser()` | The guard could not read the login cookie |
| `enableCors(...)` | No CORS headers |
| `setGlobalPrefix('api/v1')` | Routes lived at `/auth/login`, not `/api/v1/auth/login` |
| `SnakeToCamelPipe`, then the `ValidationPipe` | No key change, and no refusal of unknown fields |
| `ResponseInterceptor` | No `data` wrapper, no snake_case keys |
| `AllExceptionsFilter` | No three-key error shape |

The guards were not affected, because `AuthModule` registers them with `APP_GUARD`.

**The options and the decision:**

| Option | Summary | Verdict |
|---|---|---|
| **a. One shared function (chosen)** | Move the setup lines into `configureApp(app)` in `src/app.setup.ts`. `main.ts` and the tests both call it. | The tests and the real app can never drift apart. |
| b. Repeat the lines in the tests | Copy the setup into the test files. | Two copies of the same rules. A later change to `main.ts` would leave the tests on the old setup, and they would still pass. |
| c. Register the pipes, interceptor, and filter in `AppModule` | Use `APP_PIPE`, `APP_INTERCEPTOR`, and `APP_FILTER`. | It does not cover the prefix, the cookie reader, or CORS, so the setup would live in two places in two styles. |

**What goes where:**

| File | Holds |
|---|---|
| `src/app.setup.ts` | `configureApp(app)`: the `FRONTEND_URL` check, `cookieParser()`, CORS for `FRONTEND_URL` only with credentials, the `api/v1` prefix, the two pipes in the same order, the response interceptor, and the exception filter |
| `src/main.ts` | `NestFactory.create(AppModule)`, then `configureApp(app)`, then `app.enableShutdownHooks()` and `app.listen(...)` |

`enableShutdownHooks()` and `listen()` stay in `main.ts`, because only a real running server gets a stop signal and opens a port. A test calls `app.init()` and `app.close()` itself.

`configureApp()` must run after the app is built and before `listen()` or `init()`, because Nest reads these settings while it starts up. The order of the lines inside the function is exactly the old order in `main.ts`, so nothing changed for the real server.

Check: `npx tsc --noEmit`, `npm run build`, then `npm run start:dev`. `http://localhost:3000/api/v1` must show `{"data":"Hello World!"}`, and `http://localhost:3000/api/v1/nothing-here` must show the three-key 404.

## Step 46 — Add the Test App Helper and Update the Starter Test

**`test/support/create-test-app.ts`** has one function, `createTestApp()`. It builds the module tree from `AppModule`, calls `createNestApplication()`, calls `configureApp(app)`, then `app.init()`, and returns the app. Every e2e file that needs the app calls this one function, so no test repeats setup lines.

**`test/app.e2e-spec.ts`** was replaced. The old test asked for `GET /` and expected the plain text `Hello World!`. That only passed because the setup was missing. The two new tests:

| Test | What it proves |
|---|---|
| `GET /api/v1` gives the wrapped hello reply | The prefix and the `data` wrapper are on: the body is `{ "data": "Hello World!" }`. |
| An unknown route gives the three-key error shape | The exception filter is on: the body has exactly `status_code`, `message`, and `errors`. |

After this step, `npm run test:e2e` passed 5 tests in 2 suites.

Commit: `src/app.setup.ts`, `src/main.ts`, `test/support/create-test-app.ts`, and `test/app.e2e-spec.ts`.

## Step 47 — Add the Auth E2E Tests

**Rate limits in tests.** Login and register allow 5 calls per minute per address. In tests every request comes from the same address, so 6 logins in one minute would give `429` by accident. Two facts about `@nestjs/throttler` help: the counts live in the app's memory, so a new app starts at 0; and each route has its own count, because the key is built from the controller, the route method, and the address.

| Choice | Verdict |
|---|---|
| **1. A new app for every test (chosen)** | `beforeEach` calls `createTestApp()` and `afterEach` closes the app. The real throttler runs untouched, and no app code changes. It costs a few extra seconds. |
| 2. Swap or reset the throttler storage | Depends on the throttler's inner storage, which is not a clearly documented public API. |
| 3. Turn the throttler off in tests | The tests would no longer check the real app. |
| 4. Read the limits from `.env` | **Not allowed.** It weakens the real app. A wrong `.env` on a live server would turn off the login protection. |

**`test/jest-e2e.json`** gets one more key, `"testTimeout": 30000`. bcrypt with 12 rounds takes about a quarter of a second per hash, and every test builds a fresh app. The 429 test does 6 password checks, which can pass Jest's default limit of 5 seconds.

**`test/auth.e2e-spec.ts`** holds 15 tests. Each test starts with `cleanDatabase()` and a fresh app. The messages below are the Part 9 texts (with a capital letter):

| Group | Test | Expected |
|---|---|---|
| register | safe fields only | `201`. The keys are exactly `academic_year`, `bio`, `department`, `id`, `name`, `role`. No `email`, no `password_hash`. The role is `student`. |
| register | same email again | `409`, `This email is already registered` |
| register | extra `role` field | `400`, an `errors` item `{ field: "role", message: "property role should not exist" }`, and no user row is created |
| register | short password | `400`, and the `errors` list names `password` |
| register | snake_case input | `academic_year: 3` comes back as `academic_year: 3`, and the database row has `academicYear = 3` |
| login | correct login | `200`. `access_token` (path `/`) and `refresh_token` (path `/api/v1/auth`) are both HttpOnly. Neither token is in the JSON body. The body has the person's own email. |
| login | wrong password and unknown email | The same `401`, `Email or password is not correct`, and no cookies |
| login | 6 wrong logins | `401` five times, then `429` with a `Retry-After` header and the full body `{ status_code: 429, message: "Too many requests. Please try again later", errors: [] }` (the message check was added in Part 9) |
| me | with the access cookie | `200`, own data, no `password_hash` |
| me | without a cookie | `401`, `Please log in to continue` |
| refresh | valid refresh cookie | `200`, two new cookies, and the new refresh token differs from the old one |
| refresh | old token used again | `401`, `The session is not valid. Please log in again`. The newer token is refused too, and the database has no active refresh token left for that user. |
| logout | logout | `200`. Both cookies come back cleared (empty value, `Expires=Thu, 01 Jan 1970`). The refresh token is cancelled in the database, the cancelled token cannot refresh, and `/auth/me` without a cookie gives `401`. |
| suspended | `/auth/me` with a valid access cookie | `401`, `Please log in to continue` |
| suspended | login with the right password | The general `401`, and no cookies |

**Rules inside the test file:**
1. The messages and cookie names are written out in full, not imported from the code. An e2e test checks the contract with the frontend, so a changed message must make the test fail and force a decision.
2. **Tokens are never printed.** A normal check like `expect(text).not.toContain(token)` prints the token when it fails. Every check that touches a token or a `Set-Cookie` line compares to `true` or `false` instead, so a failed test shows only `true` or `false`.
3. The test database client (`createTestPrisma()`) is used only to set up a state (a suspended account) and to read rows back (active refresh tokens). All other work goes through the real routes.
4. The suspended status comes from `UserStatus.suspended` in the generated client, never typed by hand.
5. The logout test checks what a browser does. It does not claim the old access token is dead (see Known Limits in Part 7).

Commit: `test/jest-e2e.json` and `test/auth.e2e-spec.ts`.

## Step 48 — Verify Part 8

Run from `backend/` unless noted:

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | Prints nothing |
| Build | `npm run build` | No errors |
| Unit tests | `npm test` | 111 tests pass in 12 suites |
| E2E tests | `npm run test:e2e` | `preparing the database "studycircle_test"`, Prisma lines that name `studycircle_test`, and 20 tests pass in 3 suites (`app.e2e-spec.ts` 2, `database-rules.e2e-spec.ts` 3, `auth.e2e-spec.ts` 15) |
| Real server | `npm run start:dev`, then open `http://localhost:3000/api/v1` | `{"data":"Hello World!"}` |
| Development data | DBeaver on `studycircle`: `SELECT COUNT(*) FROM users;` | Not `0` |
| Git (repository root) | `git status --short` | No `.env`, `node_modules`, `dist`, `src/generated`, `backend/generated`, or skill folders |
| `package.json` | `git --no-pager diff package.json` | No change |

The auth test file takes about 27 seconds, because each test builds a fresh app and bcrypt is slow on purpose.

Prisma may print an "Update available 7.10.1 -> 8.0.0-rc..." box during the e2e run. Ignore it. An `rc` (release candidate) is a test version before a real release, and Prisma 8 is a major update. The project stays on `7.10.1`.

---

# Part 9 — Plain 429 Message and Capital-Letter Auth Messages (ADDED)

**What problem this solves:** every error message is shown to a student as it is, because the API shape rules say `message` is safe to show on screen. A student who logs in too many times saw `ThrottlerException: Too Many Requests`, which is a code name, not a sentence. The auth messages also started with a lowercase letter, while every other message (the filter defaults and the database messages) started with a capital letter. This part gives the student one clear, polished style in every error, before the frontend starts showing them.

> **Status (19 November 2026):** the work in this part is written, committed, and checked. `npx tsc --noEmit` prints nothing and `npm run build` has no errors. `npm test` passes 114 tests in 12 suites (it was 111). `npm run test:e2e` passes 20 tests in 3 suites, and the output names `studycircle_test`. `npm run start:dev` still works, and `GET http://localhost:3000/api/v1` still gives `{"data":"Hello World!"}`. The development database kept its demo data. The work was saved in two commits.

**Part 9 did not change `tsconfig.json`, `prisma.config.ts`, the schema, any migration, `app.module.ts`, the throttler settings, `package.json`, or `package-lock.json`.** No new packages were installed. The 3-month plan and the schema file needed no change.

## Step 49 — Send a Plain Sentence for the 429 Reply

**Where the old message came from:**
1. The `ThrottlerGuard` counts the calls. On the 6th login in one minute, it puts the `Retry-After` header on the reply, then throws a `ThrottlerException`. That is a normal NestJS `HttpException` with status `429` and the text `ThrottlerException: Too Many Requests`.
2. The exception filter treated it like any client error and sent that text as the `message`.
3. The filter already had the right sentence in `DEFAULT_MESSAGES[429]`, but a default is used only when an error has no message. The throttler always sends one, so the default never ran.

**The options and the decision:**

| Option | Summary | Verdict |
|---|---|---|
| **1. Fix it in the exception filter (chosen)** | In case 1 of `describe()`, any `429` uses `DEFAULT_MESSAGES[429]`. | All error wording stays in one place, the filter. It is a small change, it is easy to unit test, and it also covers the later rate limits on join requests, uploads, and chat messages. |
| 2. Set `errorMessage` in the throttler settings | `@nestjs/throttler` has an `errorMessage` option, but only in the object form of `ThrottlerModule.forRoot()`, not in the array form used in `app.module.ts`. | It would change the rate limit setup just to change a sentence, and the wording would live in two places. |

The one cost of option 1: if a service ever throws its own `429` with a special message, the filter replaces it with the plain sentence. No code does that today.

**Why `Retry-After` stays:** the guard sets the header before the error reaches the filter. The filter only calls `status()` and `json()`, never a header function. A unit test proves the filter never calls `setHeader` or `removeHeader`, and the e2e test proves the real header is still there.

**The files:**

| File | Change |
|---|---|
| `src/common/filters/all-exceptions.filter.ts` | A `TOO_MANY_REQUESTS` constant and one new check in case 1: a `429` returns the plain sentence and an empty `errors` list. The old comments that used "we" and "us" were also reworded to match the project's comment rule. |
| `src/common/filters/all-exceptions.filter.spec.ts` | 3 new tests: the real `ThrottlerException` gives the plain sentence, any other `429` gives the same sentence, and the filter never touches the reply headers. The 9 old tests are unchanged. |
| `test/auth.e2e-spec.ts` | The 429 test now checks the full body, `{ status_code: 429, message: "Too many requests. Please try again later", errors: [] }`, next to the `Retry-After` check. |

After this step, `npm test` passed 114 tests in 12 suites.

Commit: the three files above.

## Step 50 — Start the Auth Messages With a Capital Letter

The API shape rules (Section 3) write every message with a capital first letter, and so does the exception filter. The auth messages were the only ones in lowercase. The frontend is not built yet, so this was the cheapest moment to change them.

| Old | New | Where it is written |
|---|---|---|
| `email or password is not correct` | `Email or password is not correct` | `INVALID_CREDENTIALS_MESSAGE` in `auth.service.ts` |
| `the session is not valid. please log in again` | `The session is not valid. Please log in again` | `INVALID_SESSION_MESSAGE` in `auth.service.ts` |
| `this email is already registered` | `This email is already registered` | the new `EMAIL_TAKEN_MESSAGE` in `auth.service.ts` (it was written out before) |
| `please log in to continue` | `Please log in to continue` | `UNAUTHENTICATED_MESSAGE` in `jwt-auth.guard.ts` |

**Other changes in the same step:**
1. `auth.controller.ts`: `me()` now imports `UNAUTHENTICATED_MESSAGE` from the guard, instead of typing the same text a second time. One old comment (the throttler module was "a later step") was also fixed.
2. `auth.controller.spec.ts`: the fake errors now use the real message constants instead of written-out text.
3. `auth.service.spec.ts` and `jwt-auth.guard.spec.ts` needed no change, because they already import the constants.
4. `test/auth.e2e-spec.ts`: the message constants at the top now hold the new texts, and the 409 test uses `EMAIL_TAKEN_MESSAGE`. The e2e tests still write each message out in full, on purpose.

**What did not change:** the field messages inside the `errors` list, like `property role should not exist`. class-validator writes them, and they start with the field name in snake_case (API shape, Section 3, rule 4).

The unit count stays at 114 in 12 suites. The e2e count stays at 20 in 3 suites.

Commit: `auth.service.ts`, `guards/jwt-auth.guard.ts`, `auth.controller.ts`, `auth.controller.spec.ts`, and `test/auth.e2e-spec.ts`.

**Verify Part 9.** Run from `backend/` unless noted:

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | Prints nothing |
| Build | `npm run build` | No errors |
| Unit tests | `npm test` | 114 tests pass in 12 suites |
| E2E tests | `npm run test:e2e` | 20 tests pass in 3 suites, and the output names `studycircle_test` |
| Real server | `npm run start:dev`, then open `http://localhost:3000/api/v1` | `{"data":"Hello World!"}` |
| Rate limit (Postman, optional) | 6 wrong logins in one minute | `401` five times, then `429` with `"message": "Too many requests. Please try again later"` and a `Retry-After` header |
| Development data | DBeaver on `studycircle`: `SELECT COUNT(*) FROM users;` | Not `0` |
| `package.json` | `git --no-pager diff package.json` | No change |

---

# Part 10 — Profile Routes (ADDED)

**What problem this solves:** step 2 of the main journey is "the student fills a short profile". When a student asks to join a group, the leader needs to see who is asking: a name, a department, a year, a short bio, and the subjects the student cares about. Without a profile, a leader would approve strangers blindly, and the platform would fall back to the "messy social media group" problem. This part lets each student build and edit their own profile, and lets other logged-in students see a safe public version of it, with no email and nothing that reveals a hidden account.

> **Status (20 November 2026):** the work in this part is written, committed, and checked. `npx tsc --noEmit` prints nothing and `npm run build` has no errors. `npm test` passes 163 tests in 16 suites (it was 114 in 12). `npm run test:e2e` passes 44 tests in 4 suites (it was 20 in 3), and the output names `studycircle_test`. `npm run start:dev` still works, the five new routes appear in the start-up log, and `GET http://localhost:3000/api/v1` still gives `{"data":"Hello World!"}`. A Postman round of 10 screenshots (tests 20 to 29) passed, and the two seed students used in it were put back and checked in DBeaver. `git diff -- package.json` printed nothing. The development database kept its demo data.

> **Update (21 November 2026):** Step 57 is written, committed, and checked. `npm test` now passes 165 tests in 17 suites. `npm run test:e2e` still passes 44 tests in 4 suites.

**Part 10 did not change `tsconfig.json`, `prisma.config.ts`, the schema, any migration, `app.module.ts`, `app.setup.ts`, `package.json`, or `package-lock.json`.** No new packages were installed. Email change and password change are **not** part of this part. They belong in the auth module later, because they touch login details and tokens.

## Step 51 — The Profile Decisions

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Who may see a public profile? | Any logged-in user | Groups do not exist yet. A "share a group" rule would also block a leader from seeing a student who is only asking to join. |
| 2 | Which fields does the public profile show? | `id`, `name`, `department`, `academic_year`, `bio`, `subjects` (active subjects only, each as `id` and `name`). **No email and no role.** | Email is never shown to others. Hiding the role stops a stranger from finding the admin account. |
| 3 | How are subjects of interest changed? | `POST /users/me/subjects` adds one, `DELETE /users/me/subjects/:subjectId` removes one. At most **10** subjects. | Each error is clear (404, 409), and it fits the composite primary key of `user_subjects`. |
| 4a | Year range | `academic_year` is a whole number from **1 to 6** in both the register form and the profile edit | It matches the register form, and some programmes last longer than 4 years. |
| 4b | Clearing fields | `null` clears `department`, `bio`, and `academic_year`. `name` can never be null or empty. An empty body `{}` gives `400`. | Every account needs a name. An empty change is most likely a form mistake. |
| 4c | Empty text | `""` or only spaces becomes `null` for `department` and `bio`, in both DTOs | An HTML form sends `""` for an empty box. One meaning ("no value") is saved in the database. |
| 5 | Email and password change | Not in this part. Later, in the auth module, with the current password and all refresh tokens cancelled. | They are login details, not profile details. |

**The schema has a small text difference.** `studycircle_database_schema_mvp_v4.md` says `academic_year` is "for example 1, 2, 3, or 4". The code allows 1 to 6. The column (`smallint`) needs no change, only the example text in the schema file.

## Step 52 — Shared Rules for Both Forms

The register form and the profile edit form must never disagree, so their rules live in one place.

| File | What it holds |
|---|---|
| `src/users/users.constants.ts` (NEW) | `USER_NAME_MAX_LENGTH` (100), `USER_DEPARTMENT_MAX_LENGTH` (100), `USER_BIO_MAX_LENGTH` (500), `ACADEMIC_YEAR_MIN` (1), `ACADEMIC_YEAR_MAX` (6), `MAX_SUBJECTS_PER_USER` (10), and the six profile messages |
| `src/common/utils/text-transforms.ts` (NEW, + spec) | `trimText` (removes outer spaces, for required text like a name) and `trimToNull` (removes outer spaces and turns empty text into `null`, for optional text) |
| `src/common/constants/database-limits.ts` (NEW) | `MAX_INT_ID` (2,147,483,647), the largest value of a PostgreSQL `integer` column. It is exported from the constants barrel, because groups and sessions will need it too. |
| `src/auth/dto/register.dto.ts` (CHANGED) | It now imports the shared numbers and `trimText`, uses `trimToNull` for `department`, and allows `null` for `department` and `academicYear`. The limits did not change. |
| `src/users/users.service.ts` (CHANGED) | `CreateStudentInput` now allows `null` for `department` and `academicYear`. |

**The profile messages** (each is a plain sentence with a capital letter, written once, in `users.constants.ts`):

| Constant | Text | Status |
|---|---|---|
| `NOTHING_TO_UPDATE_MESSAGE` | `Send at least one field to change` | `400` |
| `PROFILE_NOT_FOUND_MESSAGE` | `This profile does not exist` | `404` |
| `SUBJECT_NOT_FOUND_MESSAGE` | `This subject does not exist` | `404` |
| `SUBJECT_ALREADY_ADDED_MESSAGE` | `This subject is already in your list` | `409` |
| `SUBJECT_NOT_IN_LIST_MESSAGE` | `This subject is not in your list` | `404` |
| `SUBJECT_LIMIT_MESSAGE` | `You can add up to 10 subjects` (built from the limit) | `409` |

`PROFILE_NOT_FOUND_MESSAGE` was first written as `Not found`. It was changed, because the exception filter already uses `Not found` for `P2025`, and the same text must not be written in two code files.

## Step 53 — The DTOs and the Safe Id Pipe

| File | What it does |
|---|---|
| `src/users/dto/update-profile.dto.ts` (NEW) | The `PATCH /users/me` body. It lists **only** `name`, `department`, `academicYear`, and `bio`, all optional. It does **not** list `email`, `role`, `status`, `password`, or `id`, so the validation pipe refuses them with `400`. This is the first separate update DTO. |
| `src/users/dto/add-subject.dto.ts` (NEW) | The `POST /users/me/subjects` body: `subjectId`, a whole number from 1 to `MAX_INT_ID`. The client sends `subject_id`. A text like `"5"` is refused. |
| `src/common/pipes/parse-id.pipe.ts` (NEW, + spec) | Turns an id from the address into a safe number. Anything that can never be a row id gives `404` with the message the route chooses. |
| `src/users/dto/users-dto.spec.ts` (NEW) | Unit tests for both DTOs. One test runs the real validation pipe and proves `property role should not exist`. |

**The `@IsOptional()` trap.** `@IsOptional()` skips every check when a value is `undefined` **or `null`**. On `name` that would let `name: null` through, and the database would refuse it with a `500`. So `name` uses `@ValidateIf((body) => body.name !== undefined)` instead: a missing name is fine, but a sent name (even `null`) must pass `@IsString()`, `@IsNotEmpty()`, and `@MaxLength()`.

**Why a custom id pipe and not `ParseIntPipe`.** Nest's `ParseIntPipe` answers a bad id with a `400` in its own wording, and it lets a number like `99999999999` through. That number is bigger than the `integer` column, so Prisma throws and the reply is a `500`. `ParseIdPipe` gives a clean `404` instead, with a message from the route, for example `@Param('id', new ParseIdPipe(PROFILE_NOT_FOUND_MESSAGE)) id: number`.

**The pipe order trap (found by the e2e tests).** Global pipes run **before** a pipe written on one parameter. The global validation pipe has `transform: true`, so for a parameter declared as `number`, it already turns the text `"12"` into the number `12` (and `"abc"` into `NaN`). The first version of `ParseIdPipe` accepted only text, so it refused every real id with `404`. The unit tests did not catch it, because they called the pipe directly with text. The fix: the pipe accepts both text (strict digits only) and a number (a whole number from 1 to `MAX_INT_ID`). Some odd spellings like `007` or `1e3` now count as ids 7 and 1000, which is harmless. Two unit tests now copy the real situation. Docs: https://docs.nestjs.com/pipes#global-scoped-pipes

## Step 54 — The Users Service and the Response Shapes

`src/users/users.service.ts` keeps its old methods and adds the profile logic.

**Select lists and reply shapes:**

| Name | Fields |
|---|---|
| `SUBJECT_SUMMARY_SELECT` | `id`, `name` |
| `PUBLIC_PROFILE_SELECT` | `id`, `name`, `department`, `academicYear`, `bio`, and `userSubjects` (only subjects with `isActive: true`, sorted by name) |
| `OWN_PROFILE_SELECT` | The public list plus `email` and `role` |
| `PublicProfile` and `OwnProfile` | The reply shapes. Two small mapping functions write every field by hand and flatten the link rows into `subjects: [{ id, name }]`, so no database detail reaches a reply. |

**The new methods:**

| Method | What it does |
|---|---|
| `getOwnProfile(userId)` | Reads a live account (`deletedAt: null`) with the own shape. Returns `null` when the account is gone, and the controller answers `401`. |
| `getPublicProfile(id)` | Reads only a live **and** active account (`status: active`). An unknown, suspended, or deleted account gives the same `404`, `This profile does not exist`. |
| `updateOwnProfile(userId, dto)` | Copies the four allowed fields one by one (the DTO is never spread into the query). An empty change gives `400`. The update finds the row by id and `deletedAt: null`. A row deleted a moment ago gives `P2025`, which the filter turns into `404`. |
| `addSubject(userId, subjectId)` | One interactive transaction at the **Serializable** level: the subject must exist and be active (`404`), must not be in the list yet (`409`), and the list must have fewer than 10 active subjects (`409`). Then the link row is saved. A duplicate that slips through at the same moment gives `P2002`, which the service turns into the same exact `409`. |
| `removeSubject(userId, subjectId)` | `deleteMany` with the user id in the condition, so a person can only remove their own row. Zero deleted rows give `404`, `This subject is not in your list`. |

**Why the own profile returns `null` instead of throwing `401`:** the `401` message lives in `jwt-auth.guard.ts`, and the guard already imports the users service. If the service imported the guard's file, each file would wait for the other at load time. So the controller throws the `401`, the same way `/auth/me` does.

**Why Serializable:** it makes PostgreSQL act as if two transactions ran one after the other, so two quick clicks cannot push the list past 10. If two transactions collide, Prisma gives `P2034`, and the filter answers `409`, `The server was busy. Please try again`. Docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions

**Hidden subjects** (`is_active = false`) never show on any profile and do not count toward the limit of 10. Removing a hidden subject's row still works.

## Step 55 — The Users Controller and the Routes

`src/users/users.controller.ts` (NEW, + spec) is thin: it reads the input, calls the service, and returns the result. `src/users/users.module.ts` now lists it under `controllers`.

**The routes** (all start with `/api/v1`, all need a login, none has `@Public()`):

| Route | Body or address | Success reply | Errors |
|---|---|---|---|
| `GET /users/me/profile` | — | `200`, own profile with own `email`, `role`, and `subjects` | `401` |
| `PATCH /users/me` | `name`, `department`, `academic_year`, `bio` (all optional) | `200`, the new own profile | `400` (bad value, extra field, empty body), `401` |
| `GET /users/:id/profile` | id in the address | `200`, public profile (no email, no role) | `401`, `404` (unknown, suspended, deleted, or a bad id) |
| `POST /users/me/subjects` | `subject_id` | `201`, the added subject `{ id, name }` | `400`, `401`, `404` (unknown or inactive subject), `409` (already added, or the list is full) |
| `DELETE /users/me/subjects/:subjectId` | subject id in the address | `200`, `{ "data": null }` | `401`, `404` (not in the list, or a bad id) |

**Safety rules in the controller:**
1. Every route that changes data has `me` in the address and no user id. The user id always comes from `@CurrentUser()`, so nobody can edit another person's profile.
2. The `me` routes are declared **before** `:id/profile`, so the word `me` is never read as an id. Even if it were, `ParseIdPipe` would give `404`.
3. `@Param()` reads one route parameter by name. The rule "always take the whole object" is about the body and the query, not route parameters.

## Step 56 — Tests and Verify Part 10

**Unit tests** (`npm test`): 163 tests in 16 suites.

| File | Tests |
|---|---|
| `src/common/utils/text-transforms.spec.ts` (NEW) | 8 |
| `src/common/pipes/parse-id.pipe.spec.ts` (NEW) | 6 |
| `src/users/dto/users-dto.spec.ts` (NEW) | 14 |
| `src/users/users.service.spec.ts` (CHANGED) | 25 (10 old, 15 new) |
| `src/users/users.controller.spec.ts` (NEW) | 6 |

**E2E tests** (`npm run test:e2e`): 44 tests in 4 suites (`app` 2, `database-rules` 3, `auth` 15, `users` 24).

`test/support/login-helper.ts` (NEW) registers and logs in an account through the real routes and gives back the user id and a ready `Cookie` value. It never prints a token. `test/users.e2e-spec.ts` (NEW) holds 24 tests. Subjects are created in each test through the test Prisma client, because `cleanDatabase()` empties the `subjects` table too.

| Group | What is proved |
|---|---|
| Login is required | All five routes give `401`, `Please log in to continue`, without a cookie |
| Own profile | `200`, exactly the 8 own keys, own email |
| Edit | The row really changes, `academic_year` goes in as snake_case and reaches the code as `academicYear`, `null` and `""` clear fields, `role`, `email`, and `status` are refused with nothing saved, a bad year or a long bio names the field, a `null` name is refused, an empty body gives the plain sentence, and an `id` in the body is refused while one person's change never touches another person's row |
| Public profile | Exactly the 6 safe keys, no email anywhere, hidden subjects left out, and the same `404` for a suspended account, a deleted account, an unknown id, a word, and a huge number |
| Subjects | Add (`201`), add twice (`409`), unknown (`404`), inactive (`404`, no row made), the 11th subject (`409`, list stays at 10), remove (`200`, `{ "data": null }`), not in the list or a word (`404`), a subject hidden later disappears from the own profile, and one person cannot remove another person's subject |
| Register | An empty `department` is saved as `null` (decision 4c) |

**A lesson from the e2e run:** in the first run, three tests passed for the wrong reason. They expected `404`, and the broken id pipe gave `404` to everything. Only the two tests that needed a valid id showed the bug. A test that expects an error can hide a bug, so every error case should have a matching success case.

**Verify.** Run from `backend/` unless noted:

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | Prints nothing |
| Build | `npm run build` | No errors |
| Unit tests | `npm test` | 163 tests pass in 16 suites (165 in 17 after Step 57) |
| E2E tests | `npm run test:e2e` | 44 tests pass in 4 suites, and the output names `studycircle_test` |
| Real server | `npm run start:dev` | The five `Mapped {/api/v1/users/...}` lines appear, and `http://localhost:3000/api/v1` gives `{"data":"Hello World!"}` |
| Postman | Tests 20 to 29 in `postman_manual_api_tests.md` | All pass. The screenshots are `20-profile-own-success.png` to `29-profile-own-no-login-401.png` |
| Development data | DBeaver on `studycircle`: `SELECT COUNT(*) FROM users;` | Not `0` |
| `package.json` | `git --no-pager diff package.json` | No change |

**Commits:** one for the profile code (11 files) and one for the profile tests (7 files), then one per Postman screenshot.

## Step 57 — Use the Shared Login Message in @CurrentUser()

**What problem this solves:** the "please log in" reply must look the same everywhere. If a future route forgets its guard, the student still gets the same clean, capital-letter sentence as on every other route, and the code keeps only one copy of the text.

**The problem.** `current-user.decorator.ts` threw its own text, `please log in to continue`, when no person was on the request. The guard uses `UNAUTHENTICATED_MESSAGE` (`Please log in to continue`). So the code had two copies of the same message, and one copy broke the capital-letter rule from Part 9. The fallback fires only when a route misses its guard, so no user saw it.

**The files:**

| File | Change |
|---|---|
| `src/auth/decorators/current-user.decorator.ts` (CHANGED) | Imports `UNAUTHENTICATED_MESSAGE` from the guard and throws it. The inner function is now a named export, `currentUserFactory`, and `CurrentUser` is built from it with `createParamDecorator(currentUserFactory)`. |
| `src/auth/guards/jwt-auth.guard.ts` (CHANGED) | `import { AuthUser }` became `import type { AuthUser }`. Nothing else changed. |
| `src/auth/decorators/current-user.decorator.spec.ts` (NEW) | 2 tests: the function gives back the person that the guard put on the request, and with no person it throws an `UnauthorizedException` with status `401` and exactly `UNAUTHENTICATED_MESSAGE`. |

**Why `currentUserFactory` is exported:** a finished decorator made by `createParamDecorator` cannot be called like a normal function in a test. Exporting the inner function lets a unit test call it with a small fake context. Docs: https://docs.nestjs.com/custom-decorators

**Why `import type` in the guard:** the decorator now imports a value from the guard, and the guard imports `AuthUser` from the decorator. Two files that import each other can load in a loop, and then one value can be `undefined` at start-up. `AuthUser` is only a type, and TypeScript drops type-only imports from the built code, so the loop never happens at run time. `import type` writes that promise into the code, so a later edit cannot break it by accident. Docs: https://www.typescriptlang.org/docs/handbook/modules/reference.html#type-only-imports-and-exports

**The optional cleanup that was dropped.** `test/auth.e2e-spec.ts` could have used `test/support/login-helper.ts`. It was checked and not done:
1. The helper gives back only the user id and the access cookie. Most auth tests also need the refresh cookie, the full `Set-Cookie` lines (to check `HttpOnly` and `Path`), and the raw reply.
2. Only 2 of the 15 auth tests could use it. The other tests still need `findCookieLine`, `cookieValue`, `hasCookieSetting`, and `loginStudent`, so nothing would be deleted, and the file would mix two login styles.
3. The auth tests check the login route itself, so their own detailed login code is on purpose.

**Verify Step 57.** Run from `backend/`:

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | Prints nothing |
| Lint | `npm run lint` | 0 errors. The 19 `unbound-method` warnings are older, in `jwt-auth.guard.spec.ts` and `roles.guard.spec.ts`, and are not part of this step. |
| Unit tests | `npm test` | 165 tests pass in 17 suites (it was 163 in 16) |
| E2E tests | `npm run test:e2e` | 44 tests pass in 4 suites (no change), and the output names `studycircle_test` |

**About the 19 lint warnings:** those tests pass a method like `DemoController.prototype.closed` to a fake context, only so the guard can read the `@Public()` or `@Roles()` mark on it. The method is never called, so the "may lose `this`" risk cannot happen there. They can be cleaned up later as a separate small item.

Commit: the three files above, with the subject `fix: use the shared login message in the current user decorator.`

## Known Limits of the Profile Routes

| Limit | Plain-English explanation |
|---|---|
| Any logged-in user can read any active student's public profile | Ids are numbers, so profiles can be read one by one. The public view holds only safe fields, so this is accepted for now. When groups exist, the rule could become "share a group, or have a pending request to my group". |
| Odd id spellings count as ids | After the global pipe, `007` becomes 7 and `1e3` becomes 1000. Every bad case still gives `404`, never a `500`. |
| No route lists the subjects a person can pick | The frontend will need it for the subject picker. It fits with the later subjects and levels work. |

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

## Final Folder Structure (After Dependency Audit Review) (ADDED)

This shows only what is **new or changed** after Part 6. Everything else stays as in the trees above.

```text
backend/
├── package.json                      (CHANGED: @nestjs/mau removed from devDependencies)
└── package-lock.json                 (CHANGED: unused packages removed, safe updates inside the allowed ranges)
```

## Final Folder Structure (After Authentication) (ADDED)

This shows only what is **new or changed** after Part 7. Everything else stays as in the trees above.

```text
studycircle-peer_study_group_finder/
├── screenshots/
│   └── postman_manual_api_testing/   (19 screenshots: 01-register-success ... 19-rate-limit-429)
└── backend/
    ├── .env.example                  (CHANGED: JWT_ACCESS_SECRET and FRONTEND_URL added)
    ├── package.json                  (CHANGED: @nestjs/jwt, @nestjs/throttler, cookie-parser, @types/cookie-parser)
    └── src/
        ├── app.controller.ts         (CHANGED: @Public() on the starter route)
        ├── app.module.ts             (CHANGED: ThrottlerModule)
        ├── main.ts                   (CHANGED: cookie-parser, CORS for FRONTEND_URL only)
        ├── users/
        │   ├── users.module.ts       (CHANGED: provides and exports UsersService)
        │   ├── users.service.ts
        │   └── users.service.spec.ts
        └── auth/
            ├── auth.constants.ts
            ├── auth.module.ts        (CHANGED: JwtModule, UsersModule, three global guards)
            ├── auth.controller.ts
            ├── auth.controller.spec.ts
            ├── auth.service.ts
            ├── auth.service.spec.ts
            ├── auth-cookies.ts
            ├── auth-cookies.spec.ts
            ├── token.service.ts
            ├── token.service.spec.ts
            ├── dto/
            │   ├── register.dto.ts
            │   └── login.dto.ts
            ├── decorators/           (three files: public, roles, current-user)
            └── guards/
                ├── jwt-auth.guard.ts
                ├── jwt-auth.guard.spec.ts
                ├── roles.guard.ts
                └── roles.guard.spec.ts
```

## Final Folder Structure (After Shared Setup and Auth E2E Tests) (ADDED)

This shows only what is **new or changed** after Part 8. Everything else stays as in the trees above. `package.json` did not change.

```text
backend/
├── .gitignore                        (CHANGED: one anchored, commented set of rules for the skill folders)
├── generated/                        (REMOVED: an old, unused copy of the Prisma client. It was never tracked.)
├── src/
│   ├── app.setup.ts                  (NEW: configureApp(), the shared setup for main.ts and the e2e tests)
│   └── main.ts                       (CHANGED: calls configureApp(), then shutdown hooks and listen)
└── test/
    ├── app.e2e-spec.ts               (CHANGED: checks GET /api/v1 and the three-key 404)
    ├── auth.e2e-spec.ts              (NEW: 15 tests for the auth routes)
    ├── jest-e2e.json                 (CHANGED: testTimeout 30000)
    └── support/
        └── create-test-app.ts        (NEW: builds the test app with configureApp())
```

## Final Folder Structure (After Plain Messages) (ADDED)

This shows only what is **changed** after Part 9. No file was added or removed. `package.json` did not change.

```text
backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts        (CHANGED: me() reuses the guard's message)
│   │   ├── auth.controller.spec.ts   (CHANGED: uses the real message constants)
│   │   ├── auth.service.ts           (CHANGED: capital-letter messages, new EMAIL_TAKEN_MESSAGE)
│   │   └── guards/
│   │       └── jwt-auth.guard.ts     (CHANGED: capital-letter message)
│   └── common/
│       └── filters/
│           ├── all-exceptions.filter.ts       (CHANGED: every 429 gets the plain sentence)
│           └── all-exceptions.filter.spec.ts  (CHANGED: 3 new tests)
└── test/
    └── auth.e2e-spec.ts              (CHANGED: new message texts, full 429 body check)
```

## Final Folder Structure (After Profile Routes) (ADDED)

This shows only what is **new or changed** after Part 10, including Step 57. Everything else stays as in the trees above. `package.json` did not change.

```text
studycircle-peer_study_group_finder/
├── screenshots/
│   └── postman_manual_api_testing/   (CHANGED: 10 new screenshots, 20-profile-own-success ... 29-profile-own-no-login-401)
└── backend/
    ├── src/
    │   ├── auth/
    │   │   ├── decorators/
    │   │   │   ├── current-user.decorator.ts       (CHANGED in Step 57: shared message, exported currentUserFactory)
    │   │   │   └── current-user.decorator.spec.ts  (NEW in Step 57: 2 tests)
    │   │   ├── dto/
    │   │   │   └── register.dto.ts           (CHANGED: shared limits and helpers, empty department becomes null)
    │   │   └── guards/
    │   │       └── jwt-auth.guard.ts         (CHANGED in Step 57: type-only import of AuthUser)
    │   ├── common/
    │   │   ├── constants/
    │   │   │   ├── database-limits.ts        (NEW: MAX_INT_ID)
    │   │   │   └── index.ts                  (CHANGED: exports database-limits)
    │   │   ├── pipes/
    │   │   │   ├── parse-id.pipe.ts          (NEW: safe id from the address, or 404)
    │   │   │   └── parse-id.pipe.spec.ts     (NEW: 6 tests)
    │   │   └── utils/
    │   │       ├── text-transforms.ts        (NEW: trimText and trimToNull)
    │   │       └── text-transforms.spec.ts   (NEW: 8 tests)
    │   └── users/
    │       ├── dto/
    │       │   ├── add-subject.dto.ts        (NEW)
    │       │   ├── update-profile.dto.ts     (NEW)
    │       │   └── users-dto.spec.ts         (NEW: 14 tests)
    │       ├── users.constants.ts            (NEW: field limits, subject limit, profile messages)
    │       ├── users.controller.ts           (NEW: five profile routes)
    │       ├── users.controller.spec.ts      (NEW: 6 tests)
    │       ├── users.module.ts               (CHANGED: lists UsersController)
    │       ├── users.service.ts              (CHANGED: profile selects, reply shapes, five new methods)
    │       └── users.service.spec.ts         (CHANGED: 15 new tests)
    └── test/
        ├── users.e2e-spec.ts                 (NEW: 24 tests for the profile routes)
        └── support/
            └── login-helper.ts               (NEW: registers and logs in, gives the id and the cookie)
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
| Jest says it did not exit one second after the tests finished | A test left a database connection or an app open. | Call `prisma.$disconnect()` in `afterAll`, and `app.close()` after every `createTestApp()`. |
| The "both partial unique indexes" test fails | An index is missing from `studycircle_test`. A migration was edited, or the database was built another way. | Never edit an applied migration. Check `pg_indexes`. Rebuild the test database from the migrations. |
| `ExperimentalWarning: VM Modules is an experimental feature` | The test scripts run Node with `--experimental-vm-modules`. | Ignore it. It is only a warning. |
| `npx tsc --noEmit` asks "Need to install the following packages: tsc" | The command was run outside `backend/`, so npx cannot find the installed TypeScript and offers a different package named `tsc`. | Do not type `y`. Press `Ctrl+C`, run `cd backend`, then run the command again. |
| `git diff` stops with `(END)` at the bottom | Git shows long output in a pager. | Press `q` to leave it. Next time use `git --no-pager diff`. |
| `npm audit` still lists findings after `npm audit fix` | The remaining findings have no safe fix. npm suggests `--force`, which would install an old Jest. | Do not use `--force`. Check that the list holds only development tools (Part 6, Step 34), and keep the "Known issues" note in the README. |
| The app refuses to start and mentions `JWT_ACCESS_SECRET` | The variable is missing from `backend/.env`, or it is shorter than 32 characters. | Add a secret of at least 32 characters (Step 36). Never put it in `.env.example` or Git. |
| The app refuses to start and mentions `FRONTEND_URL` | The variable is missing from `backend/.env`. | Add it, for example `http://localhost:3001`. |
| `GET /api/v1/auth/me` gives `401` right after a login in Postman | The access cookie lives only 15 minutes, or Postman did not keep the cookie. | Log in again, then call `me` in the same Postman window. |
| The first register gives `409` | The test account already exists. | Continue from the duplicate test, or delete the row in DBeaver (Step 43). |
| A login or register call gives `429` | The limit is 5 calls per minute per address. | Wait 60 seconds. The reply has a `Retry-After` header with the wait time. |
| Refresh gives `401` after a put-back of an old cookie | A refresh token works once. Using a used or cancelled token cancels every refresh token of that user. | This is the rule working. Log in again. |
| A suspended person still seems logged in | The frontend shows old data. The server refuses every request at once. | Check the server reply. It must be `401`. |
| Postman shows an orange or purple "Fix 401" or "Add tests" bar | A Postman helper, not part of the project. | Click **Decline**. Do not "fix auth". Close the bar before a screenshot. |
| The browser does not send the cookie to the API | CORS is not set for credentials, or the frontend address does not match `FRONTEND_URL`, or the frontend is on a different site. | Check `FRONTEND_URL`, use `withCredentials` in Axios, and read the deployment notes in Part 7. |
| `@nestjs/throttler` does not work with Nest 12 | An old version is installed. | Use `6.6.0` or newer (`^6.7.1` was used). |
| A `429` reply shows `ThrottlerException` again | The 429 check in `all-exceptions.filter.ts` was removed, or the app was started without `configureApp()`. | Put the check back (Part 9, Step 49) and run `npm test`. The filter unit tests and the e2e 429 test catch this. |
| An e2e test fails on a `message` right after a wording change | The e2e tests write every message out in full, on purpose. | If the change was deliberate, update the constant at the top of `test/auth.e2e-spec.ts` in the same commit. If not, fix the code. |
| A WebSocket call gives `401` | The global HTTP guards do not fit WebSockets. | The chat gateway needs its own login check (Part 7, chat note). |
| An e2e test gets `404` on every `/api/v1` route, or replies have no `data` wrapper | The test built its app without `configureApp()`. | Build the app with `createTestApp()` from `test/support/create-test-app.ts` (Step 46). |
| An e2e test gets `401` on `/auth/me` right after a login | The test did not send the cookie back, or the app was built without the cookie reader. | Send the cookie in a `Cookie` header, and build the app with `createTestApp()`. |
| An e2e test gets `429` by accident | One test calls login or register more than 5 times, or one app is shared by many tests. | Build a fresh app in `beforeEach` (Step 47). Never raise or turn off a rate limit for tests. |
| `Exceeded timeout of 5000 ms` in an e2e test | bcrypt is slow on purpose, and every test builds a fresh app. | Keep `"testTimeout": 30000` in `jest-e2e.json`. |
| The app refuses to start inside the e2e tests and mentions `FRONTEND_URL` | `configureApp()` checks it for tests too, and it is missing from `backend/.env`. | Add `FRONTEND_URL` to `backend/.env`. Do not remove the check. |
| `.agents`, `.claude`, `.windsurf`, or `skills-lock.json` shows up in `git status` | The ignore rules in `backend/.gitignore` are missing. | Add them back (Step 44), then run `git check-ignore -v .agents .claude .windsurf skills-lock.json` from `backend/`. |
| A `backend/generated/` folder comes back | An old Prisma setting with a different `output` was used. | Check that `schema.prisma` has `output = "../src/generated/prisma"`. The folder is ignored. Delete it (Step 44). |
| `git check-ignore -v coverage` prints nothing, but the root `.gitignore` has `coverage/` | A rule with a trailing `/` matches only a folder, and the folder does not exist yet. | Ask with a trailing slash: `git check-ignore -v coverage/`. |
| A route with an id in the address gives `404` for every id, even a real one | A pipe on the parameter expects text, but the global validation pipe (`transform: true`) has already turned the text into a number. | Accept a number in the parameter pipe too, like `ParseIdPipe` (Part 10, Step 53). Test it with a real id in an e2e test, not only with text in a unit test. |
| `GET /users/12/profile` gives `500` for a very large id | The id went past the `integer` column limit and reached Prisma. | Use `ParseIdPipe` on every id in the address. It gives `404` above `MAX_INT_ID`. |
| `PATCH /users/me` gives `500` when `name` is `null` | `@IsOptional()` treats `null` as missing and skips every check. | Keep `@ValidateIf((body) => body.name !== undefined)` on `name` (Part 10, Step 53). |
| `PATCH /users/me` with `{}` gives `400`, `Send at least one field to change` | An empty change is refused on purpose. | Send at least one of `name`, `department`, `academic_year`, `bio`. |
| `POST /users/me/subjects` gives `404` for a subject that is in the database | The subject is hidden (`is_active = false`). A hidden subject acts as if it does not exist. | Pick an active subject, or have the admin show the subject again. |
| `POST /users/me/subjects` gives `409`, `You can add up to 10 subjects` | The list already holds 10 active subjects. | Remove one first. |
| `POST /users/me/subjects` gives `400` with `subject_id must be an integer number` | The id was sent as text, like `"5"`. | Send a JSON number: `{ "subject_id": 5 }`. |
| A public profile gives `404` for a student who exists | The account is suspended or deleted. This is on purpose, and the reply is the same as for an unknown id. | Check `status` and `deleted_at` in DBeaver. Restore the account if it was suspended for a test. |
| An e2e test that expects `404` passes, but the route is broken | An error test can pass for the wrong reason when everything gives the same error. | Pair every error test with a success test on the same route. |
| `npm run lint` shows `typescript(unbound-method)` warnings in `jwt-auth.guard.spec.ts` and `roles.guard.spec.ts` | Those tests pass `DemoController.prototype.<method>` to a fake context so the guard can read a route mark. The method is never called. | Safe to leave. They are warnings, not errors (Part 10, Step 57). Clean them up later as a separate small item. |

## Quick Cheat Sheet

| Purpose | Command or action |
|---|---|
| Install the exact Nest CLI | `npm install -g @nestjs/cli@12.0.11` |
| Create the backend from the repository root | `nest new backend --skip-git` |
| Enter the backend folder | `cd backend` |
| Install packages from the lock file (fresh clone) | `npm ci` |
| Start the development server | `npm run start:dev` |
| Build the backend | `npm run build` |
| Check the code style (oxlint, changes no files) | `npm run lint` |
| Run unit tests | `npm test` |
| Run end-to-end tests (builds `studycircle_test` from the migrations first, then runs) | `npm run test:e2e` |
| Run only the auth e2e tests | `npm run test:e2e -- auth.e2e-spec` |
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
| See the full vulnerability list | `npm audit` |
| Find out which package needs another package | `npm ls package_name_here` |
| Preview the safe audit fix (changes nothing) | `npm audit fix --dry-run` |
| Apply the safe audit fix (never add `--force`) | `npm audit fix` |
| Show the `package.json` changes without the pager | `git --no-pager diff package.json` |
| See which rule ignores a path | `git check-ignore -v path_here` |
| See whether Git tracks a path | `git ls-files path_here` |
| Make a strong secret for `JWT_ACCESS_SECRET` (copy it into `.env` by hand, never paste it anywhere) | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| Install the auth packages | `npm install @nestjs/jwt @nestjs/throttler cookie-parser` and `npm install --save-dev @types/cookie-parser` |
| Check that an open route is open | `curl.exe http://localhost:3000/api/v1` (expect `200`) |
| Check that a locked route is locked | `curl.exe http://localhost:3000/api/v1/auth/me` (expect `401`) |
| Check refresh token hashes (DBeaver, `studycircle`) | The query in Part 7, Step 43 (it never selects `token_hash`) |
| Check password hashes (DBeaver, `studycircle`) | The query in Part 7, Step 43 (it shows only `left(password_hash, 4)`) |
| Run only the profile e2e tests | `npm run test:e2e -- users.e2e-spec` |
| Check the two seed students after a Postman round (DBeaver, `studycircle`) | The query in `postman_manual_api_tests.md`, "Check the two seed students after round 2" |
| See the own profile (Postman, logged in) | `GET http://localhost:3000/api/v1/users/me/profile` |
| See another student's public profile (Postman, logged in) | `GET http://localhost:3000/api/v1/users/3/profile` |

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
- Every route starts with `/api/v1`. The prefix is set only in `configureApp()` in `src/app.setup.ts`.
- Reply shapes follow `studycircle_api_shape_v6.md`. If a rule must change, change that file first and give it a new version number.
- Controllers take the whole body or query as one DTO object. Never pick one key by name.
- Never send a raw Prisma object. Use a response shape that lists only the safe fields.
- Keep the pipe order in `configureApp()`: the snake-to-camel pipe first, then the validation pipe.
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
- Run `npx tsc --noEmit` from `backend/`. Outside that folder, npx offers to download a different package called `tsc`. Never type `y` for it.
- Never run `npm audit fix --force`, and never accept the "fixes" `jest@25.1.0` or an older `@nestjs/mau`. They are downgrades. Use the plain `npm audit fix` and read the `package.json` diff before every commit.
- Remove a package that the project does not use instead of trying to fix it. Do not add `@nestjs/mau` back unless the team decides to deploy with Mau. Its own instructions install it globally.
- Run `npm audit --omit=dev` before submission. It must say `found 0 vulnerabilities`. Explain every finding that remains in the README under "Known issues".
- Every route is locked by default (global guards). A route is open only when it has `@Public()`. Never remove the global guards to "make a route work".
- Keep the global guard order: `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`.
- Tokens live only in HttpOnly cookies. Never put a token in a JSON reply, a log, a screenshot, or a chat message.
- Never store a raw refresh token. Store only its SHA-256 hash in `refresh_tokens.token_hash`.
- A refresh token works once. A cancelled token used again cancels all refresh tokens of that user.
- The role and the account status are read from the database on every request. Never trust the role inside the token.
- Every login failure gives the same `401` message. Never say whether the email or the password was wrong.
- Register never accepts a `role` field. Keep `role` out of every input DTO.
- Never send `password_hash`, `token_hash`, or another person's `email` in any reply. Use response shapes that list only safe fields.
- `JWT_ACCESS_SECRET` must be at least 32 characters and lives only in `backend/.env`. `FRONTEND_URL` must be set. The app refuses to start without them.
- CORS allows only `FRONTEND_URL`, with credentials. Never use `*` with cookies.
- Set `NODE_ENV=production` in deployment (it turns on the `Secure` cookie flag), and set Express `trust proxy` behind a proxy.
- The rate limit is per address and in memory. Raise the login limit to 10 per minute before a classroom demo.
- WebSocket chat needs its own login check on connect and on every message. The HTTP guards do not cover it.
- Never show cookie values, `.env`, or real passwords in a screenshot. Click **Decline** on Postman helper bars before a screenshot.
- App-wide setup (the prefix, the pipes, the interceptor, the filter, the cookie reader, and CORS) goes only in `configureApp()` in `src/app.setup.ts`. `main.ts` and the e2e tests both call it. Never add an app-wide setting to `main.ts` alone.
- Every e2e test that starts the app builds it with `createTestApp()`. Never build a bare app in a test.
- E2E tests build a fresh app before each test, so the rate limit counts start at 0. Never raise, read from `.env`, or turn off a rate limit to make a test pass.
- Never print a token or a cookie value in test output. Compare tokens with `true` or `false` checks only.
- E2E tests check the exact messages and cookie names as written text. When a message changes on purpose, change the test in the same commit.
- The Prisma skill folders (`.agents`, `.claude`, `.windsurf`) and `skills-lock.json` are not committed. `backend/.gitignore` blocks them.
- Every top-level error `message` starts with a capital letter and is a plain sentence that is safe to show on screen. Field messages inside `errors` start with the snake_case field name.
- Write each error message once, as a constant, and import it where it is needed. Never type the same message text in two code files. (The e2e tests are the one exception: they write messages out in full on purpose.)
- Every `401` for "not logged in" uses `UNAUTHENTICATED_MESSAGE` from `jwt-auth.guard.ts`, including the fallback in `@CurrentUser()`.
- When two files import from each other and one side needs only a type, use `import type` on that side, so the two files never load each other in a loop.
- Export the inner function of a custom decorator (like `currentUserFactory`), so a unit test can call it directly.
- Every `429` reply gets its sentence from the exception filter. Do not set the message in the throttler settings, so the wording stays in one place.
- Every route that changes a person's own data uses `me` in the address and takes the user id from `@CurrentUser()`. Never accept a user id in the body or the address for "my own" changes.
- A public profile never shows `email`, `role`, `status`, or `password_hash`. A suspended or deleted person is hidden from every public view with the same `404` as an unknown id.
- Every id in the address goes through `ParseIdPipe` with a route message. Never pass an unchecked address id to Prisma.
- Global pipes run before parameter pipes. With `transform: true`, a parameter declared as `number` arrives as a number. Test every id route with a real, valid id in an e2e test.
- Field limits shared by two forms live in one constants file (`src/users/users.constants.ts`). Never write the same limit number in two DTOs.
- Use `@ValidateIf` instead of `@IsOptional()` for a field that may be missing but must never be `null`.
- Update DTOs list only the fields a person may change. Never list `email`, `role`, `status`, `password`, or `id` in a profile DTO.
- Copy allowed fields into a Prisma `data` object one by one. Never spread a DTO into a query.
- Every error test needs a matching success test, so a test cannot pass for the wrong reason.
