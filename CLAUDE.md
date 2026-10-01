# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online DnD platform for playing with friends: 3D map, real-time updates, persistent state. pnpm workspaces monorepo, TypeScript everywhere. Production: https://dnd.aoshi.ru.

- `apps/web` — Vite + React 19 + Mantine + react-router. Has auth (login/register) and character list/creation.
- `apps/server` — NestJS 12, **native ESM**, Drizzle + Postgres, pino. Modules: `auth`, `users`, `characters`, `database`.
- `packages/shared` — types shared by web and server (currently the DnD 5e character sheet).

**Not built yet:** the 3D map (react-three-fiber) and realtime (Socket.IO). Don't assume they exist because the README mentions them.

## Commands

From the repo root:

```bash
pnpm install
pnpm dev               # web + server + shared watcher
pnpm dev:web           # web only, http://localhost:5173
pnpm dev:api           # server only, http://localhost:3000 (API under /api)
pnpm test              # unit tests, web + server
pnpm lint              # each app's own eslint.config.mjs
pnpm format            # prettier --write (format:check to verify)
```

From `apps/server`: `pnpm test:e2e` (needs a reachable `DATABASE_URL`), `pnpm build`, `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio`.

Single test: `pnpm --filter api exec vitest run path/to/file.spec.ts` or `pnpm --filter web exec vitest run path/to/file.test.tsx` (add `-t "name"` to filter).

## Gotchas

- **Build `packages/shared` before running an app in isolation** (`pnpm --filter shared build`). Without its `dist/`, the server crashes with `ERR_MODULE_NOT_FOUND` even though type-checking passes. `pnpm dev` handles it.
- **Server relative imports need `.js` extensions** (`./dir/index.js` for directories); use `import.meta.dirname`, not `__dirname`.
- **Migrations never run on boot.** A schema change needs `pnpm db:generate` and a committed migration in `apps/server/drizzle/`.
- **API routes live under `/api`.** In production the SPA is served from the same origin.
- **ESLint configs are per app on purpose.** Don't merge them into a shared root config; the reason is in [docs/monorepo.md](docs/monorepo.md).
- **Tests run on Vitest with globals off.** Import `describe`/`it`/`expect`/`vi` from `vitest`.
- **Windows.** LF→CRLF warnings in `git status` are noise. In Git Bash prefix builds with `MSYS_NO_PATHCONV=1`, or `VITE_API_URL=/api` gets mangled.

## Docs

Read the relevant file before working in that area:

- [docs/server.md](docs/server.md) covers the server:
  - TS/ESM config
  - logging setup
  - database and schema conventions
  - HTTP surface
  - auth (cookies, refresh tokens)
  - security middleware (helmet, throttler, trust proxy)
  - tests
- [docs/web.md](docs/web.md) covers the web app:
  - layout
  - API access and auth bootstrap
  - styling (CSS Modules)
  - TS config
  - tests (`renderWithProviders`, fetch mocking)
- [docs/monorepo.md](docs/monorepo.md) covers the monorepo:
  - workspace layout
  - the `shared` package
  - linting rationale
  - Prettier
- [docs/deploy.md](docs/deploy.md) covers deployment:
  - CI pipeline via the `deploy` branch
  - Docker image
  - server layout
  - checking production

Keep these docs current: when a change makes something in them wrong, update them in the same commit.

## Conventions (mandatory)

### File structure and size

- **One file, one responsibility.** Keep entry points and aggregating modules thin; move the implementation into neighbouring files.
- **Aim for about 100–150 lines.** Past that, a file probably does several things, so split it if they separate cleanly. This is a readability heuristic, not a hard limit. Don't split a cohesive file just to hit the number.
- **Folder per entity.** When an entity (React component, Nest module or service, …) gains two or more implementation files besides its main one, move it into its own folder:
  - layout: `EntityName/EntityName.tsx`, `EntityName.types.ts`, `EntityName.module.css`, …;
  - an `index.ts` barrel re-exports the public surface;
  - files that count: styles, `.types.ts`, a second logic file;
  - a single colocated `*.spec.ts`/`*.test.ts` doesn't count.
- **Colocate feature constants and types** with their usage, not in an app-wide barrel.

### Logging (`apps/server`)

Every provider that does external I/O (DB, external APIs, socket events) logs through pino. Never stay silent and never use `console.*`:

1. Inject the logger: `@InjectPinoLogger(ClassName.name) private readonly logger: PinoLogger`. This adds `context: "ClassName"` to every line.
2. Log the start of the operation and its key parameters at `debug`/`info`.
3. Measure the duration: `const t0 = Date.now()` before the call, `durationMs: Date.now() - t0` after it.
4. Log completion with the duration and relevant metadata: row counts for DB work, key fields for external calls.
5. Log errors with `logger.error({ err }, 'description')`.

```typescript
@Injectable()
export class SomeService {
  constructor(
    @InjectPinoLogger(SomeService.name) private readonly logger: PinoLogger,
  ) {}

  async doWork() {
    const t0 = Date.now();
    try {
      const result = await externalCall();
      this.logger.info({ durationMs: Date.now() - t0 }, 'Operation completed');
      return result;
    } catch (err) {
      this.logger.error({ err }, 'Operation failed');
      throw err;
    }
  }
}
```

### Error handling

- Every `async` function either propagates errors to its caller or catches and logs them. Never swallow one silently, and an empty `catch {}` is not allowed.
- A fire-and-forget call (an un-awaited promise, a `.then()` chain) must end with a `.catch(...)` that logs the error.
- Where to log:
  - **Server:** `PinoLogger`.
  - **Web:** there's no logger yet, so at least `console.error` with context.

### Comments

- **Write code comments in Russian.**
- **Comments are welcome where the code isn't self-explanatory:**
  - complex conditions and multi-step flows;
  - invariants and constraints;
  - library workarounds;
  - anywhere a reader would ask "why is it done this way?".
- **Explain why, not what.** Don't restate the code (`// increment counter` over `counter++`).
- **User-facing strings are in Russian too.** That includes server error messages, which the UI shows as-is.
