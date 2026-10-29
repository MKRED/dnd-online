# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online DnD platform for playing with friends: 3D map, real-time updates, persistent state. pnpm workspaces monorepo, TypeScript everywhere. Production: https://dnd.aoshi.ru.

- `apps/web` — Vite + React 19 + Mantine + react-router. Has a search field in the header on every page («/» focuses it; a dropdown of own and published records by section), a home page «Пульт» (running sessions with a way to the scene, own games, open games with free seats, own characters, bookmarks and recent maps; three first steps for a newcomer), auth (login/register, sign-in through lolka, a profile page in sections — «Аккаунт» (login and password), «Карта и игра» (the facing mark, the health mark), «Графика» (kept per device in the browser; a preset or own options: animation rate, 3D models for everyone, the party or nobody, sharpness, a frame limit, antialiasing) and «Нейросеть» (the API tokens for the MCP servers); a menu on the left on a wide screen, a list of sections on a phone), characters (list, create, edit, delete; player characters and NPCs split by chips in the list, an image gallery with a main image and its thumbnail, a 3D model (`.glb` or STL with a colour) with a turning preview (in the form with a lineup height board and the facing arrow; on the sheet without them) and a manual fit; on the sheet: a BG3-style equipment doll above the inventory (slots around the character's 3D model or a silhouette, attunement up to three) that sets the sheet's numbers (AC from armor and shield with the form's «КД без доспеха» when unarmored, an «Атаки» block from the weapons in hand, Speed −10 ft. for armor heavier than Strength, a Stealth disadvantage mark; an attunement item's magic counted only when attuned, unless a part is marked to work without it, with a «Нет настройки» line), inventory, effects, catalog abilities (passive traits among them: the «Черта» activation with its own effect components, counted in the sheet's numbers in both views), spell slots and the actions per turn (the line «За ход»)), items (a shared catalog: own and published items, grid or list, item card, a form with an image and its thumbnail; equipment categories — weapon, armor, shield, clothing and jewellery (two categories) with a slot — filled from a book sample, with a magic bonus and attunement, each magic part marked whether it works without attunement; items, abilities and effects share a «Источники» field of text lines or links), block groups (the «Блоки» catalog section: the user's own map blocks with uploaded 16×16 textures per face or a base look recoloured by the group's main colour, and the rules properties, a delete warning naming the maps and scenes that use them), voxel models (the «Модели» catalog section: a model of up to 8×8×8 map cells drawn in a full-screen 3D voxel editor with a brush, mirror, height slice, palette and the path properties of its cells, or uploaded as a `.glb` or STL file (over 10 MB compressed in the browser first) drawn as is and turned into voxels for the rules; copied from others like block groups), furniture (the «Обстановка» catalog section: an own voxel model picked, drawn or edited right from the form, a floor, wall, ceiling or doorway mount, and named positions with their own models for doors and chests; copied together with its models), monsters (a catalog section with type chips and a CR range, a stat-block form and a card laid out like the character sheet, with catalog abilities, per-day spells, gear and effects edited on it, and a 3D model on the map linked from an own «Модели» model with a size factor, uploaded or drawn right from the form), maps (list, create, delete, 3D view via react-three-fiber, GM block editor with undo/redo), games (a shared list, a lobby closed by a password or open, seats taken by player characters, a session the GM starts and ends that locks the seated characters' sheets (outside it players only watch the scene), the game log (entries grouped by kind with a filter, each marked whether players will see it, with a «Глазами игроков» preview; damage by typed parts) and the game library (copies of the catalog records the game uses; its button shows how many copies were changed in the catalog and can be refreshed) in drawers for the GM, scenes (copies of the GM's maps; the active one on its own page, open or closed to players, edited live by the GM with the map editor's tools, objects hidden from players, undo and redo; the characters' figures on start points (a standing card, or the character's 3D model), moved along a path within a Speed-based allowance (everyone sees a move hop cell by cell along the server's path, a creature only where the party sees it), dragged live, placed by the GM, and driven by a controller the GM names; the characters' hit points (damage as typed parts for mixed damage), death saves, spell slots, effects and equipment doll (no armor or attunement change in combat, the cost as a hint: a house rule for weapons — one free swap a turn — and the book for shield and armor) changed in play by the GM, the owner or the controller, written to the sheet and the log, with the effects read from the game library; monsters and NPCs on the scene as instances with their own hit points and effects (an NPC drawn as its 3D model from the game library's copy, as on the GM's map, and wearing its doll from the copy), players seeing only «Ранен» and «Повержен»), live lobby updates and presence over a Socket.IO socket), and bookmarks (a star on the view page of a character, item, ability, effect or monster; the «Закладки» page).
- `apps/server` — NestJS 12, **native ESM**, Drizzle + Postgres, pino. Modules: `auth`, `users`, `characters` (with its inventory, equipment doll, effects and abilities), `character-images`, `character-models` (a character's 3D model), `maps`, `items`, `item-images`, `abilities`, `effects`, `block-groups` (the user's own map blocks), `voxel-models` (the «Модели» catalog of voxel models), `furniture` (the «Обстановка» role over an own voxel model), `monsters`, `bookmarks`, `search` (the header's search across sections), `games`, `api-tokens`, `database`; `catalog/` holds the code shared by the item, ability, effect and monster catalogs.
- `apps/mcp` — local stdio MCP server `dnd` (package `dnd-mcp`): an AI searches, reads, creates and edits the user's characters, NPCs, monsters, items, abilities, effects, block groups, voxel models and furniture and the links between them, uploads their images from disk, and builds and inspects maps (furniture placed on them too, doors opened and closed), through the REST API with an API token. Wired up in `.mcp.json`; setup in [docs/mcp.md](docs/mcp.md).
- `apps/comfy-mcp` — local stdio MCP server `comfy` (package `comfy-mcp`): image generation on a remote ComfyUI over Radmin VPN with style presets in `styles/*.json`; saves PNG files whose paths `dnd`'s `upload_image` takes. Setup in [docs/mcp.md](docs/mcp.md).
- `packages/shared` — code shared by web and server: the DnD 5e character-sheet types and the voxel map model (`src/map/`: chunks, palette, operations, ASCII slices) and the rules geometry on top of it (`src/map/rules/`: distance, creature bodies, line of sight and cover, what a party sees for the fog of war, areas of effect, walking paths), with its own vitest tests.

**Not built yet:** monsters' and NPCs' attacks on the map, weapon masteries' effects and thrown weapons (stage 6 and later of [docs/plan/combat.md](docs/plan/combat.md)); a hero's attack is built (stage 5: weapon or Unarmed Strike, targets with cover, the attack roll and the damage, `packages/shared/src/attack/`, `apps/server/src/games/combat/attack/`, `combat/AttackWindow/`); the turn order is built: the server keeps a fight's participants, rolls their Initiative and passes turns (stage 2, `apps/server/src/games/combat/`), the scene page has the «Начать бой» window, the roll window and the portrait strip with «Закончить ход» (stage 3, `apps/web/src/pages/GameScenePage/combat/`), and the turn resources with the «Ваш ход» block — actions, Bonus Actions and Reactions spent, Dash, Disengage and Dodge, «Применить» an ability with a spell slot (stage 4, `combat/TurnPanel/`); the game itself — lobby, session, log, socket, library, scenes, figures and creature state — is built ([docs/plan/done/game.md](docs/plan/done/game.md)). Don't assume they exist because the README mentions them.

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

Single test: `pnpm --filter api exec vitest run path/to/file.spec.ts`, `pnpm --filter web exec vitest run path/to/file.test.tsx`, `pnpm --filter shared exec vitest run src/map/x.test.ts` `pnpm --filter dnd-mcp exec vitest run src/server.test.ts` or `pnpm --filter comfy-mcp exec vitest run src/server.test.ts` (add `-t "name"` to filter).

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
- [docs/plan/README.md](docs/plan/README.md) is the plan summary (in Russian): the active plan, the closed ones in `docs/plan/done/`, and every leftover «на потом» from the closed plans in one list — start there when picking the next piece of work
- **Closed plans** live in [docs/plan/done/](docs/plan/done/), one file per finished piece of work (in Russian): its decisions, what was left out and the stage history. They are listed with a line each in the «Закрытые» table of [docs/plan/README.md](docs/plan/README.md); open the one you need from there. Code comments point at them by path and stage (`docs/plan/done/game.md, этап 7`), so read the plan a comment names before changing that code.
- [docs/plan/roadmap.md](docs/plan/roadmap.md) is the road to the game (in Russian, a living plan): the order of the blocks (abilities on creatures → monsters and NPCs → map editor → the game in `map.md`), monsters as a catalog and NPCs as characters, map objects as ops in the map journal, and open questions; each block gets its own detailed plan when it starts
- [docs/plan/ai-access.md](docs/plan/ai-access.md) covers AI access to the app (in Russian, a living plan): two MCP servers — `dnd` (the whole app under the user's API token: search, read, create and edit everything, links, image upload, maps) and `comfy` (image generation on a remote ComfyUI over Radmin VPN, style presets: D&D-style fantasy on a plain background, MoonArt Cauldron Mix with a hires fix), the image passed between them as a file, what the token may not do (delete, publish, touch the account), and the stage checklist
- [docs/plan/blocks.md](docs/plan/blocks.md) covers block textures and the block catalog (in Russian, a living plan): pixel 16×16 textures per face drawn in an editor or uploaded, a base colour kept for every block, the built-in blocks kept for everyone, blocks grouped by material with their own textures per shape, others' blocks copied (single or a pack) with a link to the author and «pull updates» instead of placed, world objects built in a 16³ voxel editor or uploaded (STL), the atlas and UV plan, own blocks named by their group id (no palette migration), textures kept in the group record and a fixed-size atlas per map catalog, group-level rules, live block edits in games, deleted blocks turning into air, open questions and the stage checklist
- [docs/plan/combat.md](docs/plan/combat.md) covers turn-based combat (in Russian, a living plan): the first part of stage 9 of `map.md` — a BG3-style roll window rolled by the server, initiative (players roll their own, each monster separately, ties by the modifier, surprise as Disadvantage), a «Начать бой» window with participants and newcomers, the turn-order strip above the scene, the «Ваш ход» block with small icons (catalog pictures, game-icons.net for standard actions), one attack per action plus the Light bonus attack, target choice with confirmation, the attack roll in two taps, damage applied at once; the mockups and the stage checklist
- [docs/plan/equipment.md](docs/plan/equipment.md) covers character equipment (in Russian, a living plan): a BG3-style doll with slots and the 2024 rules on top, the equipment item categories first (a book sample fills the form, magic bonus and attunement), open questions about the doll and the stage checklist
- [docs/plan/map.md](docs/plan/map.md) covers the 3D map (in Russian, a living plan):
  - decisions (voxel blocks, 1 block = 5 ft, operations, AI/MCP access, server-authoritative rules on the map)
  - open questions
  - stage checklist — tick items off as they land
- [docs/mcp.md](docs/mcp.md) covers both MCP servers: `dnd` (tools, connecting it, the build → look → fix loop) and `comfy` (tools, style presets, the generate → look → upload loop, connecting ComfyUI)
- [docs/voxel-modeling.md](docs/voxel-modeling.md) covers how an AI draws voxel models in code (in Russian): primitives (box, cylinder, ball, line, speckle), axes and "forward", style and palette, mounts and cell properties, positions for things that open, the check loop and pitfalls — read it before adding model drawing to the `dnd` MCP
- [docs/dnd/classes.md](docs/dnd/classes.md) covers the character classes: the 13 classes and their 2024 subclasses (Russian and English names, source book), where that data lives in code, and what in it is unverified
- [docs/dnd/species.md](docs/dnd/species.md) covers the character species: the 22 species: those of the 2024 books plus the Tabaxi and a homebrew Half-Tabaxi (Russian and English names, source book), where that data lives in code, and what was left out
- [docs/dnd/items.md](docs/dnd/items.md) covers the item rules data: weight in pounds (fractional, or none), cost as an amount and a coin, the coin abbreviations, and where that data lives in code
- [docs/dnd/weapons-armor.md](docs/dnd/weapons-armor.md) covers weapons, armor, shield and equipment items: the 2024 weapon and armor tables (kept in code as book samples), the weapon properties and masteries with their Russian names, AC with Dexterity by armor kind, the Strength and Stealth columns, the magic bonus and attunement allowed only on an item with a rarity, the BG3-style slots of clothing and jewellery, and the doll: its slots, two-handed weapons and shields, and the 2024 attunement rules (a Short Rest, three items, one copy, kept when taken off, no magic without it unless marked) with the app's simplifications, how 2024 magic weapons condition their extra damage, and the weapon swap house rule (one free take-off or swap a turn, then an action; the active melee or ranged set switched once a turn)
- [docs/dnd/carrying.md](docs/dnd/carrying.md) covers carrying capacity: the 2024 size table, the drag/lift/push limit, how the app counts the load (Strength × 15 for everyone, Goliath left out on purpose, no blocking over capacity) and where it lives in code
- [docs/dnd/combat.md](docs/dnd/combat.md) covers a fight in the 2024 rules: Initiative (the roll, the DM rolling for monsters, ties, the Initiative score, Surprise as Disadvantage only), rounds and turns (one action, the free object interaction, no Delay), the Attack action with Extra Attack, the Light property and Nick, Unarmed Strike, the attack roll (20 and 1, unseen attackers and targets, ranged in close combat), Opportunity Attacks, Disengage, Dodge, Help and Ready, and how the app departs (each monster rolls its own Initiative, ties by the modifier, one attack per action for now)
- [docs/dnd/combat-stats.md](docs/dnd/combat-stats.md) covers the combat numbers of the character sheet: how initiative is derived, why the hit die is picked by hand, Heroic Inspiration as a count (a house rule), Passive Perception with its effects, and the death saving throws
- [docs/dnd/durations.md](docs/dnd/durations.md) covers durations: the spell duration forms of the 2024 book, rounds and turn-bound ends, concentration, and the effect duration kinds the app uses (with «до отдыха» as a house rule)
- [docs/dnd/ability-usage.md](docs/dnd/ability-usage.md) covers how abilities are used: the activation (action, bonus action, reaction, no action, instead of an attack, longer times), the costs (own uses with their recovery, spell slots, movement, Hit Point Dice) and what the app keeps for later, plus the rest and proficiency bonus terms, and the turn actions: one action, Bonus Action and Reaction by the book, the character's base counts «Действия», «Бонусные действия» and «Реакции» (1–5, 1 by default) shown in the sheet's line «За ход»
- [docs/dnd/senses.md](docs/dnd/senses.md) covers special senses: darkvision, blindsight, tremorsense and truesight from the 2024 glossary, where they come from with their ranges, and the six sense kinds of the effect component «Чувство» (two of them added by the app)
- [docs/dnd/conditions.md](docs/dnd/conditions.md) covers the 15 conditions of the 2024 glossary (what each does, Russian and English names) and how the effect component «Состояние» uses them: each once per effect, Exhaustion as +1 level, no source or DC in the template, and each condition written as effect components for the engine (what can't be expressed yet is named)
- [docs/dnd/per-turn-damage.md](docs/dnd/per-turn-damage.md) covers damage, healing and Temporary Hit Points every turn: how 2024 spells do it (Searing Smite, Regenerate, Heroism, and the area spells that are left out) and the effect component «Урон или лечение за ход» (dice, number, the applier's modifier, start or end of turn)
- [docs/dnd/modifiers.md](docs/dnd/modifiers.md) covers lasting modifiers: Advantage, Resistance and Immunity, Speed and Armor Class rules of the 2024 glossary, what 2024 spells change while they last, Speed changes and special speeds, the six effect components of stage 7 (so far «Сопротивление и иммунитет», «Запрет лечения», «Скорость» and «Преимущество или помеха» with its conditions and Initiative) and the component «Автопровал»
- [docs/dnd/hit-points.md](docs/dnd/hit-points.md) covers hit points in play: damage through Temporary Hit Points, healing up to the maximum, dropping to 0 (massive damage, monsters dying at once), the death saves in play, Bloodied, and how the game changes a creature's hit points by what was asked (damage, healing) rather than by a number, with what others see of it
- [docs/dnd/movement.md](docs/dnd/movement.md) covers movement: Speed, Dash, Difficult Terrain and the grid in the 2024 rules, passing through and ending in other creatures' spaces, and how the game's figures follow them (players' characters are allies of each other, monsters and NPCs are not; hidden creatures don't block a player; the allowance and «Новый раунд»; free and tactical modes — the allowance refreshed after every move outside combat, spent until «Новый раунд» in it, switched by the GM's «Начать бой» as a house rule), and climbing: the 2024 Climbing, Climb Speed, switching speeds and Falling rules, a one-block ledge climbed up for 10 feet and dropped down for 5, Climb Speed with its own limit
- [docs/dnd/hazards.md](docs/dnd/hazards.md) covers hazardous blocks on the map: lava, acid, a poison swamp, fire and water as solid floor (no liquids yet), the liquids Difficult Terrain; the damage taken from 2014 DMG improvised damage and the 2024 Poisonous Gas and Inferno hazards as a house rule (the 2024 DMG has no lava or acid hazard), the one 2024 trigger (entering for the first time on a turn or starting the turn there), fixed dice with no level scaling, and where it lives in code
- [docs/dnd/doors.md](docs/dnd/doors.md) covers doors: opening one as a free object interaction, locked doors (picking and forcing DCs), the DMG 2024 door AC and HP table, secret doors and portcullises (from a Roll20 copy of the DMG, unchecked against the book), and sight through a closed door as an inference, not a rule
- [docs/dnd/terrain.md](docs/dnd/terrain.md) covers the properties of the non-hazard map blocks added for dungeons and dark fantasy (cobblestone, dark and mossy stone, dark wood, scorched earth, path, snow, rubble, bones, leaves): Difficult Terrain and Obscured Areas from the 2024 free rules, the object Armor Class and Hit Points table, walkable snow and see-through leaves as the user's decisions, bones as a house rule, and where it lives in code
- [docs/dnd/vision.md](docs/dnd/vision.md) covers vision: no sight range in Bright Light in the 2024 rules, Dim Light and Darkness as Lightly and Heavily Obscured, Blinded, walls blocking sight not written as a rule, and how the app counts it for the fog of war (the sight-mode ray, creatures not blocking sight, all around, a per-scene sight range as a house rule until lighting)
- [docs/dnd/facing.md](docs/dnd/facing.md) covers facing: no facing rule in the 2024 books (the 2014 DMG had an optional one), and the app's 8-way facing of start points and creatures on the map as a house rule, for looks only
- [docs/dnd/combining-effects.md](docs/dnd/combining-effects.md) covers how 2024 rules combine effects: different spells add up, the same spell doesn't (the most potent applies), conditions don't stack except Exhaustion, simultaneous effects, and what that means for the future engine
- [docs/dnd/attacks-and-saves.md](docs/dnd/attacks-and-saves.md) covers how abilities hit: attack rolls and saving throws, the attack bonus, range and reach (and how an ability step stores them), the 13 damage types, the 15 conditions and the 6 area shapes (Russian and English names), how 2024 spells and features combine them, and several steps and repeats (Ice Knife, Scorching Ray, Chain Lightning)
- [docs/dnd/spells.md](docs/dnd/spells.md) covers the spell fields: level (cantrip — 0, «круг» in the app), the 8 schools (Russian and English names), components V/S/M with a cost and consumption, ritual, duration, the spell block, and how spells and other abilities grow with a higher slot or the character level
- [docs/dnd/proficiencies.md](docs/dnd/proficiencies.md) covers the proficiencies of the character sheet: the four armor training categories, the strict weapon list, and the suggested lists of weapon masteries, tools and languages (Russian and English names)
- [docs/dnd/monsters.md](docs/dnd/monsters.md) covers the 2024 monster stat block: its parts in order, the usage limits (X/Day, Recharge, Legendary Resistance and Actions, Spellcasting), the sizes with their Hit Point dice, the 14 creature types (Russian and English names) and the CR → XP and proficiency bonus table
- [docs/deploy.md](docs/deploy.md) covers deployment:
  - CI pipeline via the `deploy` branch
  - Docker image
  - server layout
  - checking production

Keep these docs current: when a change makes something in them wrong, update them in the same commit.

**Plans live in `docs/plan/`**, apart from the reference docs above, which describe what is already built. When a new piece of work is big enough to need a plan (decisions, open questions, a stage checklist), put it there as `docs/plan/<topic>.md` and add it to the list above. Write it in Russian, like `map.md`, and tick stages off as they land. When every stage is ticked, move the plan to `docs/plan/done/` as is, fix the paths to it in code comments in the same commit, take its line out of the list above, add it to the «Закрытые» table of [docs/plan/README.md](docs/plan/README.md) and copy its leftovers for later into «Что осталось» there.

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

- **Every new or changed API route gets integration tests** in `apps/server/test/*.e2e-spec.ts` (how they work: [docs/server.md](docs/server.md#tests), plan: [docs/plan/done/testing.md](docs/plan/done/testing.md)). Cover at least:
  - the happy path and what it changes in the data;
  - access: anonymous (401), another user (404 or 403, as the module does it), and a shared/public variant if there is one;
  - invalid input (400) and conflicts (409) the route promises.
- **A new catalog** reuses `describeCatalog` (`test/support/catalog-scenario/`) and tests only its own fields.
- **Pure logic** (rules in `packages/shared`, mappers, validators) gets unit tests next to it; UI gets component tests as described in [docs/web.md](docs/web.md).
- **Check that a test can fail:** for an access rule, break it in the server code for a moment and see the test go red, then restore it.
- **Before a commit, check what the change touches, not everything** (decided with the user 2026-10-20: the full run got slow, and CI runs every check on every push to `master` and before every deploy, so a broken deploy can't go out):
  - type-check the packages you changed (`tsc`; rebuild `shared` first if it changed);
  - run the tests of the changed area (`vitest related <files>` or the folder), lint and `prettier --check` on the changed files;
  - run only the e2e spec files of the routes you changed.
- **Run every check** through the `test-runner` subagent (`.claude/agents/test-runner.md`, in the background) only for a wide change: `shared` types used across apps, a schema or migration, shared test helpers, config or dependencies. Otherwise leave the full run to CI.
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
