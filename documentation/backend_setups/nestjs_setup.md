# StudyCircle — Backend Setup (NestJS)

## What This Setup Produces

StudyCircle is a peer study group finder platform maintained as one monorepo. This setup creates the NestJS backend while reserving folders for the planned Next.js frontend and project documentation.

| Location | Purpose | Final state |
|---|---|---|
| `backend/` | NestJS and TypeScript backend | Scaffolded, installed, and runnable |
| `frontend/` | Planned Next.js frontend with React 19, TypeScript, and Tailwind CSS | Empty placeholder folder |
| `documentation/` | Project documentation | Contains this setup reference |
| `.git/` | Monorepo Git metadata | At the repository root only |

The planned backend data layer is PostgreSQL with Prisma ORM. Jest is included for tests. The four team areas are Auth & User Profiles; Groups & Search; Requests, Members & Chat; and Scheduling, Notes & Admin Panel.

## Prerequisites

Use Windows, PowerShell, and the VS Code terminal. Node.js 20 or later is required. The setup was completed with these versions:

| Tool | Version used |
|---|---:|
| Node.js | `v24.16.0` |
| npm | `12.0.2` |
| Git | `2.53.0.windows.1` |
| Nest CLI | `12.0.11` |
| TypeScript | `6.0.2` |
| NestJS packages | `^12.0.1` |
| Jest | `^30.0.0` |

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
| Prisma and database artifacts | Generated Prisma client, local database files, temporary migration files |
| Private uploads | `backend/uploads/`, `backend/private/`, upload folders |
| Test output | `coverage/`, `.nyc_output/`, coverage files |
| Logs and operating-system noise | Log files, `.DS_Store`, `Thumbs.db`, `Desktop.ini` |
| Editor and temporary files | Personal VS Code settings, `.idea/`, swap files, cache folders |

**Team rule:** `.env` files are never committed. The `.gitignore` rule must exist before an `.env` file is created. If an environment file, dependency folder, build output, or private upload folder appears as an untracked item, stop and correct the ignore rules before committing.

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

Open the following address in a browser:

```text
http://localhost:3000/
```

The initial response is:

```text
Hello World!
```

The server remains active in watch mode until it is stopped. Press `Ctrl+C` in the terminal to stop it.

**Port note:** Next.js also defaults to port `3000`. When the frontend is added, one application must use a different port. The likely choice is to run Next.js on port `3001`.

## Step 7 — Verify the Setup

Run these checks from the repository root or the appropriate folder:

- The repository root contains `.git/`.
- `backend/` does not contain a nested `.git/` folder.
- `git status` shows the expected new project items and does not show ignored dependencies, build output, or environment files.
- The development server starts with `npm run start:dev`.
- The development log reports `Found 0 errors`.
- `http://localhost:3000/` displays `Hello World!`.
- The backend build and tests can be run with the commands in the cheat sheet below.

## Final Folder Structure (Just After NestJS Setup)

This is the exact folder and file structure immediately after running the NestJS setup commands. A zipped copy of this repository matches this state. The tree represents the project state **just after the NestJS setup is complete**. Dependency contents are collapsed because `node_modules/` contains thousands of generated files. Git internals are also collapsed to keep the verification tree readable.

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

## Troubleshooting

| Symptom | Cause | Action |
|---|---|---|
| `nest` is not recognized | The global npm binary folder is not available in the PowerShell `PATH`, or the CLI was not installed globally. | Run `npm install -g @nestjs/cli@12.0.11`. If the command still is not recognized, add npm's global binary folder to `PATH`, restart the VS Code terminal, and run `nest --version`. |
| `TS5098` or `TS5107` mentions `moduleResolution` | `tsconfig.json` uses an incompatible module-resolution value for TypeScript 6 and `resolvePackageJsonExports`. | Set `"module": "commonjs"` and `"moduleResolution": "bundler"`. Keep `"resolvePackageJsonExports": true`. |
| `ENOENT` or files cannot be found | The command is being run from the wrong folder. | Use `cd backend` before backend scripts. Return to the repository root before root-level commands. |
| `EADDRINUSE` for port `3000` | Another process is already using the Nest or planned Next.js default port. | Stop the other process, or run the application on another port. When the frontend is added, use `3001` for Next.js if the backend remains on `3000`. |
| A second project appears inside `backend/` | Nest was run from inside `backend/`, or the project was created without the intended folder name. | Create the project from the repository root with `nest new backend --skip-git`. Remove the accidental nested project only after confirming that it contains no required work. |

## Quick Cheat Sheet

| Purpose | Command or action |
|---|---|
| Install the exact Nest CLI | `npm install -g @nestjs/cli@12.0.11` |
| Create the backend from the repository root | `nest new backend --skip-git` |
| Enter the backend folder | `cd backend` |
| Start the development server | `npm run start:dev` |
| Build the backend | `npm run build` |
| Run unit tests | `npm test` |
| Run end-to-end tests | `npm run test:e2e` |
| Stop the watch server | Press `Ctrl+C` |
| Check the running application | Open `http://localhost:3000/` |

## Rules to Never Forget

- `.env` files are never committed. The root `.gitignore` must block them before they are created.
- `.gitignore` is committed because it protects the whole monorepo.
- Do not create a nested `.git` inside `backend/`. Use `--skip-git` when scaffolding the backend.
- Use `npm run start:dev`, not `npm run dev`.
- Run `cd backend` before backend scripts.
- Keep the TypeScript values `"module": "commonjs"` and `"moduleResolution": "bundler"`.
- Port `3000` will collide when the Next.js frontend is added unless one application moves, likely to port `3001`.
