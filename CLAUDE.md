# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online DnD platform for playing with friends: 3D map, real-time updates, persistent state. pnpm workspaces monorepo, TypeScript everywhere. Production: https://dnd.aoshi.ru.

- `apps/web` — Vite + React 19 + Mantine + react-router. Has auth (login/register, sign-in through lolka, a profile page with login and password), characters (list, create, edit, delete, an image gallery with a main image and its thumbnail), items (a shared catalog: own and published items, grid or list, item card, a form with an image and its thumbnail; items, abilities and effects share a «Источники» field of text lines or links), and maps (list, create, delete, 3D view via react-three-fiber, GM block editor with undo/redo).
- `apps/server` — NestJS 12, **native ESM**, Drizzle + Postgres, pino. Modules: `auth`, `users`, `characters`, `character-images`, `maps`, `items`, `item-images`, `abilities`, `effects`, `api-tokens`, `database`; `catalog/` holds the code shared by the item, ability and effect catalogs.
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

From `apps/server`: `pnpm test:e2e` (needs `TEST_DATABASE_URL` pointing at a database whose name ends in `_test`; see [docs/server.md](docs/server.md#tests)), `pnpm build`, `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio`.

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
- [docs/plan/items.md](docs/plan/items.md) covers items (in Russian, a living plan): the shared catalog with authors and hidden/published items, the common fields (weight, cost, description, image with a thumbnail), the `details` jsonb per category, the categories ordered by difficulty and how weapons and armor will later act in play, and the stage checklist
- [docs/plan/items-filters.md](docs/plan/items-filters.md) covers the next item step (in Russian, a living plan): the simple categories (materials and quest without their own fields, food with satiety points, treasure with its kind, containers with their capacity in pounds) and the catalog filters (category chips, name search, rarity, sorting) done in the browser with their state in the URL
- [docs/plan/item-packs.md](docs/plan/item-packs.md) covers the equipment pack category (in Russian, a living plan): the pack contents table (other catalog items with a quantity), publishing only with published contents, what deleting or hiding a contained item does, the form and card, open questions and the stage checklist
- [docs/plan/character-sharing.md](docs/plan/character-sharing.md) covers the character view page and sharing (in Russian, a living plan): a read-only sheet at `/characters/:id`, access «only me» or «anyone with the link» (view only, the link is the page address), the share dialog, returning to the link after login, open questions and the stage checklist
- [docs/plan/character-inventory.md](docs/plan/character-inventory.md) covers the character inventory (in Russian, a living plan): catalog items carried by a character as links (not copies), the «При себе» and «Хранилище» places, carrying capacity from Strength, what a hidden or deleted item becomes, unpacking an equipment pack, and the stage checklist
- [docs/plan/abilities-effects.md](docs/plan/abilities-effects.md) covers what the ability and effect catalogs share (in Russian, a living plan): access like items, the common fields and tables, generalizing the item catalog code instead of copying it, how abilities, effects, items and characters will link later, open questions and the shared stage checklist
- [docs/plan/abilities.md](docs/plan/abilities.md) covers the ability catalog (in Russian, a living plan): the «Применение» block of steps (attack, saving throw, area, damage) instead of attack and save categories, the remaining categories, and the stage checklist
- [docs/plan/effects.md](docs/plan/effects.md) covers the effect catalog (in Russian, a living plan): the duration, effects as a list of components (decided 2026-10-16) with the component kinds ordered by difficulty, and the stage checklist
- [docs/plan/effects-coverage.md](docs/plan/effects-coverage.md) covers the paper check of the effect components (in Russian, a living plan): the 15 conditions and 11 benchmark spells broken into components, the gaps (conditions on Advantage, auto-fail, action limits, Speed that can't increase, base and derived values on the sheet, the ability → effect link, …), and the proposed order of work
- [docs/plan/character-effects.md](docs/plan/character-effects.md) covers effects on a character (in Russian, a living plan): catalog effects applied to a character as links, the badge strip on the sheet, the form values as the base and the totals computed in `shared`, the «С эффектами» / «Без эффектов» sheet switch, hidden and deleted effects, and the stage checklist
- [docs/plan/testing.md](docs/plan/testing.md) covers the API integration tests (in Russian, a living plan): why they're needed, a separate `dnd_online_test` database with its own `TEST_DATABASE_URL` and a guard against running on production, migrations and clean tables per test file, the app set up as in `main.ts`, a CI job with its own Postgres before deploy, and the stage checklist
- [docs/mcp.md](docs/mcp.md) covers the map MCP server: tools, connecting it, the build → look → fix loop
- [docs/dnd/classes.md](docs/dnd/classes.md) covers the character classes: the 13 classes and their 2024 subclasses (Russian and English names, source book), where that data lives in code, and what in it is unverified
- [docs/dnd/species.md](docs/dnd/species.md) covers the character species: the 22 species: those of the 2024 books plus the Tabaxi and a homebrew Half-Tabaxi (Russian and English names, source book), where that data lives in code, and what was left out
- [docs/dnd/items.md](docs/dnd/items.md) covers the item rules data: weight in pounds (fractional, or none), cost as an amount and a coin, the coin abbreviations, and where that data lives in code
- [docs/dnd/carrying.md](docs/dnd/carrying.md) covers carrying capacity: the 2024 size table, the drag/lift/push limit, how the app counts the load (Strength × 15 for everyone, Goliath left out on purpose, no blocking over capacity) and where it lives in code
- [docs/dnd/combat-stats.md](docs/dnd/combat-stats.md) covers the combat numbers of the character sheet: how initiative is derived and why the hit die is picked by hand
- [docs/dnd/durations.md](docs/dnd/durations.md) covers durations: the spell duration forms of the 2024 book, rounds and turn-bound ends, concentration, and the effect duration kinds the app uses (with «до отдыха» as a house rule)
- [docs/dnd/ability-usage.md](docs/dnd/ability-usage.md) covers how abilities are used: the activation (action, bonus action, reaction, no action, instead of an attack, longer times), the costs (own uses with their recovery, spell slots, movement, Hit Point Dice) and what the app keeps for later, plus the rest and proficiency bonus terms
- [docs/dnd/senses.md](docs/dnd/senses.md) covers special senses: darkvision, blindsight, tremorsense and truesight from the 2024 glossary, where they come from with their ranges, and the six sense kinds of the effect component «Чувство» (two of them added by the app)
- [docs/dnd/conditions.md](docs/dnd/conditions.md) covers the 15 conditions of the 2024 glossary (what each does, Russian and English names) and how the effect component «Состояние» uses them: each once per effect, Exhaustion as +1 level, no source or DC in the template, and each condition written as effect components for the engine (what can't be expressed yet is named)
- [docs/dnd/per-turn-damage.md](docs/dnd/per-turn-damage.md) covers damage, healing and Temporary Hit Points every turn: how 2024 spells do it (Searing Smite, Regenerate, Heroism, and the area spells that are left out) and the effect component «Урон или лечение за ход» (dice, number, the applier's modifier, start or end of turn)
- [docs/dnd/modifiers.md](docs/dnd/modifiers.md) covers lasting modifiers: Advantage, Resistance and Immunity, Speed and Armor Class rules of the 2024 glossary, what 2024 spells change while they last, Speed changes and special speeds, the six effect components of stage 7 (so far «Сопротивление и иммунитет», «Запрет лечения», «Скорость» and «Преимущество или помеха» with its conditions and Initiative) and the component «Автопровал»
- [docs/dnd/combining-effects.md](docs/dnd/combining-effects.md) covers how 2024 rules combine effects: different spells add up, the same spell doesn't (the most potent applies), conditions don't stack except Exhaustion, simultaneous effects, and what that means for the future engine
- [docs/dnd/attacks-and-saves.md](docs/dnd/attacks-and-saves.md) covers how abilities hit: attack rolls and saving throws, the 13 damage types, the 15 conditions and the 6 area shapes (Russian and English names), and how 2024 spells and features combine them
- [docs/dnd/proficiencies.md](docs/dnd/proficiencies.md) covers the proficiencies of the character sheet: the four armor training categories, the strict weapon list, and the suggested lists of weapon masteries, tools and languages (Russian and English names)
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

- **Check `docs/dnd/` first.** If the rule or data is already recorded there ([docs/dnd/classes.md](docs/dnd/classes.md), [docs/dnd/species.md](docs/dnd/species.md), [docs/dnd/combat-stats.md](docs/dnd/combat-stats.md), [docs/dnd/proficiencies.md](docs/dnd/proficiencies.md), …), build on that.
- **If it isn't there, look it up** in the official sources before coding, and ask the user when the sources disagree or leave it open.
- **Write down everything you find or agree on, in the same commit as the code that relies on it.** This covers both what was looked up on the web and what was decided with the user (a house rule, a simplification, something left out on purpose):
  - one file per topic, `docs/dnd/<topic>.md`, like `classes.md`; extend an existing file rather than starting a near-duplicate, and add a new file to the Docs list above;
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

### Tests

New or changed logic ships with its tests in the same commit, whenever it can be tested:

- **Every new or changed API route gets integration tests** in `apps/server/test/*.e2e-spec.ts` (how they work: [docs/server.md](docs/server.md#tests), plan: [docs/plan/testing.md](docs/plan/testing.md)). Cover at least:
  - the happy path and what it changes in the data;
  - access: anonymous (401), another user (404 or 403, as the module does it), and a shared/public variant if there is one;
  - invalid input (400) and conflicts (409) the route promises.
- **A new catalog** reuses `describeCatalog` (`test/support/catalog-scenario/`) and tests only its own fields.
- **Pure logic** (rules in `packages/shared`, mappers, validators) gets unit tests next to it; UI gets component tests as described in [docs/web.md](docs/web.md).
- **Check that a test can fail:** for an access rule, break it in the server code for a moment and see the test go red, then restore it.
- **Before a commit or deploy, run every check** through the `test-runner` subagent (`.claude/agents/test-runner.md`), in the background. CI runs the same checks on every push to `master` and before every deploy.
- If something truly can't be tested (an external service like lolka), say so in the report and in the plan, instead of skipping it silently.

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
