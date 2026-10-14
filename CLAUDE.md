# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online DnD platform for playing with friends: 3D map, real-time updates, persistent state. pnpm workspaces monorepo, TypeScript everywhere. Production: https://dnd.aoshi.ru.

- `apps/web` — Vite + React 19 + Mantine + react-router. Has auth (login/register, sign-in through lolka, a profile page with login and password), characters (list, create, edit, delete, an image gallery with a main image and its thumbnail) and maps (list, create, delete, 3D view via react-three-fiber, GM block editor with undo/redo).
- `apps/server` — NestJS 12, **native ESM**, Drizzle + Postgres, pino. Modules: `auth`, `users`, `characters`, `character-images`, `maps`, `api-tokens`, `database`.
- `apps/mcp` — local stdio MCP server for the map (an AI builds and inspects maps through the REST API with an API token). Wired up in `.mcp.json`; setup in [docs/mcp.md](docs/mcp.md).
- `packages/shared` — code shared by web and server: the DnD 5e character-sheet types and the voxel map model (`src/map/`: chunks, palette, operations, ASCII slices) and the rules geometry on top of it (`src/map/rules/`: distance, creature bodies, line of sight and cover, areas of effect, walking paths), with its own vitest tests.

**Not built yet:** gameplay on the map (plan in [docs/plan/map.md](docs/plan/map.md)) and realtime (Socket.IO). Don't assume they exist because the README mentions them.

## Commands

From the repo root:

```bash
pnpm install
pnpm dev               # web + server + shared watcher
pnpm dev:web           # web only, http://localhost:5173
pnpm dev:api           # server only, http://localhost:3000 (API under /api)
pnpm test              # unit tests: shared, web, server
pnpm lint              # each app's own eslint.config.mjs
pnpm format            # prettier --write (format:check to verify)
```

From `apps/server`: `pnpm test:e2e` (needs a reachable `DATABASE_URL`), `pnpm build`, `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio`.

Single test: `pnpm --filter api exec vitest run path/to/file.spec.ts`, `pnpm --filter web exec vitest run path/to/file.test.tsx`, `pnpm --filter shared exec vitest run src/map/x.test.ts` or `pnpm --filter map-mcp exec vitest run src/server.test.ts` (add `-t "name"` to filter).

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
  - UI changes: the UX checklist and the browser check
- [docs/monorepo.md](docs/monorepo.md) covers the monorepo:
  - workspace layout
  - the `shared` package
  - linting rationale
  - Prettier
- [docs/plan/map.md](docs/plan/map.md) covers the 3D map (in Russian, a living plan):
  - decisions (voxel blocks, 1 block = 5 ft, operations, AI/MCP access, server-authoritative rules on the map)
  - open questions
  - stage checklist — tick items off as they land
- [docs/plan/character-images.md](docs/plan/character-images.md) covers the character images (in Russian, a living plan): the gallery, the main image and its thumbnail, the viewer; decisions (storage in Postgres, owner-only access, libraries), open questions and the stage checklist
- [docs/plan/lolka-login.md](docs/plan/lolka-login.md) covers sign-in through lolka (OAuth 2.0 + PKCE, in Russian, a living plan): what lolka's API gives, the server-side flow, the `user_identities` table, open questions, what the user does outside the code, and the stage checklist
- [docs/mcp.md](docs/mcp.md) covers the map MCP server: tools, connecting it, the build → look → fix loop
- [docs/classes.md](docs/classes.md) covers the character classes: the 13 classes and their 2024 subclasses (Russian and English names, source book), where that data lives in code, and what in it is unverified
- [docs/species.md](docs/species.md) covers the character species: the 20 species of the 2024 books (Russian and English names, source book), where that data lives in code, and what was left out
- [docs/combat-stats.md](docs/combat-stats.md) covers the combat numbers of the character sheet: how initiative is derived and why the hit die is picked by hand
- [docs/proficiencies.md](docs/proficiencies.md) covers the proficiencies of the character sheet: the four armor training categories, the strict weapon list, and the suggested lists of weapon masteries, tools and languages (Russian and English names)
- [docs/deploy.md](docs/deploy.md) covers deployment:
  - CI pipeline via the `deploy` branch
  - Docker image
  - server layout
  - checking production

Keep these docs current: when a change makes something in them wrong, update them in the same commit.

**Plans live in `docs/plan/`**, apart from the reference docs above, which describe what is already built. When a new piece of work is big enough to need a plan (decisions, open questions, a stage checklist), put it there as `docs/plan/<topic>.md` and add it to the list above. Write it in Russian, like `map.md`, and tick stages off as they land.

## Conventions (mandatory)

### DnD rules and game data

The app follows the real rules of DnD 5e, **2024 edition**. Don't write rules, lists or numbers from memory, and don't invent them.

- **Check `docs/` first.** If the rule or data is already recorded there ([docs/classes.md](docs/classes.md), [docs/species.md](docs/species.md), [docs/combat-stats.md](docs/combat-stats.md), [docs/proficiencies.md](docs/proficiencies.md), …), build on that.
- **If it isn't there, look it up** in the official sources before coding, and ask the user when the sources disagree or leave it open.
- **Write down everything you find or agree on, in the same commit as the code that relies on it.** This covers both what was looked up on the web and what was decided with the user (a house rule, a simplification, something left out on purpose):
  - one file per topic, `docs/<topic>.md`, like `classes.md`; extend an existing file rather than starting a near-duplicate, and add a new file to the Docs list above;
  - name the source (book and edition, or the URL) and the date it was researched;
  - mark what is unverified, and mark where the app departs from the book and why;
  - say where that data lives in code.

### File structure and size

- **One file, one responsibility.** Keep entry points and aggregating modules thin; move the implementation into neighbouring files.
- **Aim for about 100–150 lines.** Past that, a file probably does several things, so split it if they separate cleanly. This is a readability heuristic, not a hard limit. Don't split a cohesive file just to hit the number.
- **Folder per entity.** When an entity (React component, Nest module or service, …) gains two or more implementation files besides its main one, move it into its own folder:
  - layout: `EntityName/EntityName.tsx`, `EntityName.types.ts`, `EntityName.module.css`, …;
  - an `index.ts` barrel re-exports the public surface;
  - files that count: styles, `.types.ts`, a second logic file;
  - a single colocated `*.spec.ts`/`*.test.ts` doesn't count.
- **Colocate feature constants and types** with their usage, not in an app-wide barrel.

### UI changes (`apps/web`)

Any change the user sees or touches goes through two steps besides the code itself. The details and the checklist are in [docs/web.md](docs/web.md#ui-changes-ux-and-the-browser-check).

- **Design the UX before coding.** Don't take the path of least resistance ("there's a free spot in this panel"). Think first about how the person will actually use it:
  - where it belongs among the existing controls, and how it's found;
  - what it says, in Russian, and whether it needs a tooltip or a hotkey;
  - its states: busy, disabled, empty, error, confirmation for destructive actions;
  - how many clicks a frequent action takes;
  - both colour schemes and a narrow screen.
- **Decide alone when one option is clearly best**, and say in a line why. **When several options have real tradeoffs, ask the user before writing code**: show the options (ASCII mockups help) and recommend one.
- **Check it in a real browser before calling it done.** Unit tests don't replace this. Run the dev stack, open the page through the Playwright MCP under the local test account, and check both:
  - _function_: walk the new flow end to end, including an error or edge case, and read the browser console;
  - _looks_: take screenshots and actually look at them, in the light and dark schemes, and at a narrow width if the layout changes there.
- **If the check couldn't run** (no database, no browser MCP), say so plainly instead of reporting the work as verified.

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
