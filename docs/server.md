# Server (`apps/server`)

NestJS 12 + TypeScript 6, **native ESM** (`"type": "module"`), Express platform.

## TypeScript / ESM

- `moduleResolution: nodenext`, emits native ESM. Relative imports **must** carry a `.js` extension; directory imports point at `./dir/index.js`. Use `import.meta.dirname` instead of `__dirname`.
- `emitDecoratorMetadata` + `experimentalDecorators` are required for Nest DI.
- TS 6 turns `strict` on by default — kept on, except `strictPropertyInitialization: false` (DTO fields are filled by class-transformer, not constructors).
- `types` must be listed explicitly (TS 6 default is `[]`).
- `tsconfig.build.json` pins `rootDir: ./src` (and excludes `drizzle.config.ts`, `vitest.config*.ts`) so `nest build` emits into `dist/`, not `dist/src/`. `tsBuildInfoFile` is pinned into `dist/` too, otherwise TS 6 drops it next to the config.
- Don't unify this config with `apps/web`'s — they differ by design.

## Logging

`nestjs-pino`, configured in `src/app.module.ts`, attached in `src/main.ts` via `app.useLogger(app.get(Logger))` with `bufferLogs: true`. Two targets:

- console: pretty-printed in dev, raw JSON when `NODE_ENV=production`;
- always also `apps/server/logs/app.log` as plain text (no ANSI codes), so past runs can be inspected without re-running. `logs/` is gitignored.

`LOG_LEVEL` controls the level (default `info`). Cookie headers are redacted. Usage rules for services are in [CLAUDE.md](../CLAUDE.md#logging-apps-server).

## Database

Drizzle ORM (`drizzle-orm/node-postgres`, `pg` driver) against Postgres.

- `DatabaseModule` (`src/database/`) is `@Global()` and exports `DatabaseService`: owns the `pg.Pool` and the drizzle instance (`databaseService.db`), checks connectivity with `select 1` in `onModuleInit`, closes the pool in `onModuleDestroy`.
- Schema: `src/database/schema/`, one file per table (`users.ts`, `refresh-tokens.ts`, `characters.ts`) plus an `index.ts` barrel (what `import * as schema` in `database.service.ts` resolves to). Add new tables as new files there.
- `drizzle.config.ts` lists the individual table files (not the barrel) so drizzle-kit doesn't see tables twice. It runs outside Nest DI, so it loads `DATABASE_URL` itself via `import 'dotenv/config'`.
- `DATABASE_URL` comes from `apps/server/.env` (gitignored; shape in `.env.example`), read through `ConfigModule.forRoot({ isGlobal: true })`. Never hardcode it.
- **Migrations are not run on boot.** `pnpm db:generate` writes a migration into `apps/server/drizzle/`, `pnpm db:migrate` applies it. A schema change must come with its migration.
- **Hybrid entity schema** (`characters`): frequently point-updated scalars (HP, AC, ability scores, death saves…) are real columns; variable-length nested data (spells, inventory, features, proficiencies…) is `jsonb` typed via `.$type<T>()` against `packages/shared/src/character.ts`. Use the same split for future entities shaped "fixed core + variable nested lists".

## HTTP surface

- All routes live under `/api` (`app.setGlobalPrefix('api')`) — in production the SPA is served from the same origin, and its client routes (`/characters`) would otherwise collide with API routes.
- `src/web-app.module.ts` registers `@nestjs/serve-static` only when `apps/server/public` exists (the Docker image copies `apps/web/dist` there), excluding `/api/{*path}` so unknown API routes stay JSON 404s. In dev/tests it's a no-op.
- Global `ValidationPipe({ whitelist: true, transform: true })` — DTOs in `*/dto/` use class-validator.
- CORS with `credentials: true` for `FRONTEND_URL` (default `http://localhost:5173`) — needed only in dev, where web and API run on different ports.

## Auth

- JWT access + refresh tokens in `httpOnly`, `sameSite: lax` cookies (`access_token`, `refresh_token`; `secure` in production). Secrets/TTLs from `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_SEC` (default 15 min), `JWT_REFRESH_EXPIRES_SEC` (default 30 days).
- Refresh tokens carry a random `jti` and are stored in the DB only as a sha256 hash (`RefreshTokenService`); refresh rotates the token.
- `AuthGuard` reads the access cookie and puts the payload on `request.user`.

## Security middleware

- `main.ts` sets `trust proxy = 1` — exactly one proxy (edge-nginx) appends the client IP to `X-Forwarded-For`. Changing the proxy chain means changing this number, otherwise rate limiting sees the wrong IP.
- `helmet()` with its default CSP — fine while scripts stay same-origin. Google Fonts and Mantine's runtime `<style>` tags are covered by the defaults (`https:` / `'unsafe-inline'` in `style-src`/`font-src`). A new third-party script/connect origin means extending the CSP directives there. `upgrade-insecure-requests` is production-only.
- `AuthController` is guarded by `@nestjs/throttler` (registered in `AuthModule`, in-memory storage): 60/min default, `login` 10/min, `register` 5/hour, per IP. The 429 message is in Russian because the web UI shows the server's `message` as-is.

## Tests

Vitest (`vitest.config.ts`, `vitest.config.e2e.ts`) with `unplugin-swc` — Vitest's default esbuild transform can't emit decorator metadata, without which Nest DI can't resolve constructor params.

- Unit tests: `*.spec.ts` next to the source. E2E: `test/*.e2e-spec.ts`; boots the full `AppModule`, so it needs a reachable `DATABASE_URL`.
- Globals are off: import `describe`/`it`/`expect`/`vi` from `vitest`.
- Single test: `pnpm --filter api exec vitest run path/to/file.spec.ts` (or `-t "test name"`).
