# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online DnD platform for playing with friends: 3D map, real-time updates, persistent state. pnpm workspaces monorepo, TypeScript everywhere.

- `apps/web` — frontend: Vite + React 19 + TypeScript. Planned: react-three-fiber (3D map), Mantine (UI). Currently still close to the Vite scaffold.
- `apps/server` — backend: NestJS + TypeScript. Planned: Socket.IO (realtime), Drizzle + Postgres, pino for logging (**pino is already wired up**, see below). Currently still close to the Nest CLI scaffold.
- `packages/shared` — shared types (socket events, game entities) meant to be consumed by both web and server. Currently just an empty placeholder (`export {}`).

None of the "planned" pieces above (Three.js, Socket.IO, Drizzle, Mantine) exist yet — don't assume they're wired up just because the README/stack description mentions them.

## Commands

Run from the repo root unless noted.

```bash
pnpm install          # install everything (workspace-wide)

pnpm dev               # run web + server together
pnpm dev:web           # web only, http://localhost:5173
pnpm dev:api           # server only, http://localhost:3000

pnpm lint              # lint web + server (each app's own eslint.config.mjs)
pnpm format            # prettier --write, whole repo
pnpm format:check      # prettier --check, whole repo
```

Per-app, from `apps/server`:

```bash
pnpm test              # jest, unit tests (*.spec.ts next to source)
pnpm test:watch
pnpm test:cov
pnpm test:e2e          # jest against apps/server/test/*.e2e-spec.ts
pnpm build             # nest build
```

To run a single server test: `pnpm --filter api exec jest path/to/file.spec.ts` (or `-t "test name"`).

`apps/web` has no test runner configured yet. Its `build` is `tsc -b && vite build`.

## Architecture notes

**Workspace layout.** `pnpm-workspace.yaml` includes `apps/*` and `packages/*`. Root `package.json` has no build tooling of its own beyond Prettier — TypeScript/ESLint tooling lives inside each app.

**Linting is intentionally NOT shared across packages.** Each app (`apps/web`, `apps/server`) has its own fully self-contained `eslint.config.mjs` and its own local `eslint`/`typescript-eslint` devDependencies, even though the two configs duplicate a fair amount of boilerplate. This is a deliberate workaround: a shared/base ESLint flat config imported from a root-level file broke `typescript-eslint`'s `projectService` type resolution for ambient globals (e.g. Jest's `describe`/`it`/`expect` resolved to an unresolved `error` type, tripping `no-unsafe-call`/`no-unsafe-member-access` on every test file), while explicitly imported symbols were unaffected. Inlining the exact same config directly into the app's own `eslint.config.mjs` fixed it. **Do not reintroduce a shared ESLint config across packages** unless this is confirmed fixed upstream in typescript-eslint. Prettier config (`.prettierrc`, `.prettierignore`) IS safely shared at the repo root — Prettier isn't type-aware, so it didn't hit this issue.

**`@typescript-eslint/no-explicit-any`** is `warn` in `apps/server` (relaxed from the Nest scaffold's `off`, so `any` usage is visible but not blocking) and default `error` in `apps/web` (inherited from `recommendedTypeChecked`). This asymmetry is intentional-for-now, not an oversight.

**Logging (`apps/server`).** Uses `nestjs-pino`, configured in `apps/server/src/app.module.ts` and attached in `apps/server/src/main.ts` via `app.useLogger(app.get(Logger))` with `bufferLogs: true`. Two output targets:
- console: pretty-printed in dev, raw JSON in production (`NODE_ENV=production`) for log aggregators
- always also written to `apps/server/logs/app.log` as plain human-readable text (no ANSI codes), so past runs/errors can be inspected without re-running the server. That directory is gitignored (`logs/` in root `.gitignore`).

`LOG_LEVEL` env var controls level (default `info`).

**TypeScript configs differ by app** and should not be unified: `apps/server` uses `nodenext`/CommonJS-era Nest defaults (`emitDecoratorMetadata`, `experimentalDecorators` for Nest's DI), `apps/web` uses a bundler-mode project-references setup (`tsconfig.app.json` + `tsconfig.node.json`) typical of the Vite React-TS template, with `verbatimModuleSyntax` and no emit (Vite handles bundling).

**Windows/Git note:** this repo is developed on Windows; `git status`/`diff` routinely show LF→CRLF warnings on otherwise-unmodified files — that's line-ending normalization noise, not real changes.

## Структура и размер файлов — mandatory

Чтобы файлы не разрастались и проект оставался читаемым/масштабируемым:

- **Один файл — одна обязанность.** «Главный» файл (entry-point, модуль-агрегатор) держим тонким, вынося реализацию в соседние файлы той же папки.
- **Ориентир ~100–150 строк.** Файл за ~150 строк — сигнал, что в нём несколько обязанностей; разбей, если они отделимы. Это эвристика читаемости, **не** жёсткий лимит: когезивные single-responsibility файлы дробить ради цифры не нужно.
- **Папка-сущность, когда сущность обрастает файлами.** Как только у одной сущности (React-компонент, Nest-модуль/сервис и т.п.) появляется ≥2 файла-реализации сверх основного — стили, `.types.ts`, второй `.ts`/`.tsx` с логикой и т.д. — сущность переезжает в свою подпапку по имени: `EntityName/EntityName.tsx`, `EntityName.types.ts`, `EntityName.module.css`, … + `index.ts`-барrel, реэкспортирующий публичную поверхность. Один сопутствующий `*.spec.ts`/`*.test.ts` рядом с исходником подпапку не триггерит — это норма.
- **Со-локация констант/типов.** Фичевые константы/типы лежат рядом с использованием, а не в общем barrel-файле на всё приложение.

## Логирование (apps/server) — mandatory

Каждый новый провайдер/сервис, выполняющий внешний I/O (запросы к внешним API, обращения к БД, сокет-события), **обязан** логировать через pino, а не молчать или использовать `console.*`:

1. Внедрить логгер в конструктор: `@InjectPinoLogger(ClassName.name) private readonly logger: PinoLogger` (из `nestjs-pino`) — так лог автоматически получает контекст (`context: "ClassName"`).
2. Залогировать начало операции / ключевые параметры на уровне `debug` или `info`.
3. Замерить длительность: `const t0 = Date.now()` перед вызовом, `durationMs: Date.now() - t0` в логе после.
4. Залогировать завершение с длительностью и релевантными метаданными (число строк для операций с БД, ключевые поля для внешних вызовов).
5. Логировать ошибки через `logger.error({ err }, "описание")` — никогда не глотать молча (пустой `catch {}` недопустим).

```typescript
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class SomeService {
  constructor(@InjectPinoLogger(SomeService.name) private readonly logger: PinoLogger) {}

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
