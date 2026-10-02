# Monorepo and tooling

pnpm workspaces: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`. The root `package.json` only has Prettier and scripts fanning out to the apps (`pnpm -r …`); TypeScript/ESLint tooling lives inside each app.

## `apps/mcp`

Local stdio MCP server for maps (`map-mcp` package), a thin client over the REST API — see [mcp.md](mcp.md). Built with plain `tsc`, tested with vitest (`pnpm --filter map-mcp test`). Not part of the Docker image; the Dockerfile only copies its `package.json` so `pnpm install --frozen-lockfile` sees every workspace from the lockfile. No ESLint config yet (like `shared`).

## `packages/shared`

Code consumed by web and server through a `workspace:*` dependency, re-exported from `src/index.ts`:

- `src/character.ts` — DnD 5e character-sheet types (`Character`, `AbilityScore`, `Skill`, …).
- `src/map/` — the voxel map model: coordinates and chunks, cell encoding, block shapes and catalog, palette, map operations (`parseMapOp`, `applyOp` → changeset), map summary and ASCII slices. Pure logic without I/O, so the server applies operations and the client previews them with the same code. Design and plan: [map.md](map.md).

Socket-event types will go here too.

- **Tests:** vitest, `*.test.ts` next to the code. `pnpm --filter shared test` type-checks the tests first (`tsconfig.test.json`), because `tsconfig.json` excludes them from the build so they never land in `dist/`.

- Internal relative exports need an explicit `.js` extension (`export * from './character.js'`) even though the source is `.ts` — the package is `"type": "module"` and the server resolves it with `nodenext`.
- **It must be built before consumers run.** `main`/`types` point at `dist/index.js`/`dist/index.d.ts`. Node can't map a `.js` specifier to a sibling `.ts`, so without a compiled `dist/` any code importing a _value_ (not just a type) from `shared` crashes on boot with `ERR_MODULE_NOT_FOUND`. `tsc`/`nest build` type-check fine regardless, which hides the problem.
- `pnpm dev` (root) builds and watches it automatically (it has a `dev` script). `pnpm dev:api` / `pnpm dev:web` do not — after changing `packages/shared/src` run `pnpm --filter shared build` first.

## Linting: per app, intentionally not shared

Each app has a self-contained `eslint.config.mjs` with its own `eslint`/`typescript-eslint` devDependencies, even though they duplicate boilerplate. A shared flat config imported from the root broke `typescript-eslint`'s `projectService` type resolution for ambient globals (test globals resolved to an error type, tripping `no-unsafe-call`/`no-unsafe-member-access` on every test file), while explicitly imported symbols were fine. Inlining the same config into each app fixed it. **Don't reintroduce a shared ESLint config** unless that's confirmed fixed upstream.

`@typescript-eslint/no-explicit-any` is `warn` in `apps/server` and `error` in `apps/web` (from `recommendedTypeChecked`) — intentional for now.

Prettier config (`.prettierrc`, `.prettierignore`) **is** shared at the root — Prettier isn't type-aware, so it's unaffected.

## Windows

The repo is developed on Windows. `git status`/`diff` often show LF→CRLF warnings on unmodified files — normalization noise, not real changes. For the Git Bash path-mangling gotcha see [web.md](web.md#gotcha-git-bash-on-windows).
