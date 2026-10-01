# dnd-online

Онлайн-платформа для игры в DnD с друзьями: 3D-карта, обновления в реальном времени, персистентность в Postgres.

Прод: https://dnd.aoshi.ru

## Что уже есть

- регистрация и вход (JWT в httpOnly-cookie, refresh-токены, rate limit на вход);
- персонажи по листу DnD 5e: список (свежеизменённые сверху), создание, редактирование, удаление;
- деплой в Docker на домашний сервер через ветку `deploy`.

В планах: 3D-карта (react-three-fiber) и реалтайм (Socket.IO).

## Стек

- **apps/web** — фронтенд: Vite + React 19 + TypeScript, Mantine (UI), react-router
- **apps/server** — бэкенд: NestJS 12 (нативный ESM) + TypeScript, Drizzle + Postgres, pino (логирование)
- **packages/shared** — общие типы (сейчас — лист персонажа DnD 5e), используются и фронтом, и бэком

Пакетный менеджер — pnpm workspaces. Тесты — Vitest в обоих приложениях.

## Установка

```bash
pnpm install
```

Скопировать `apps/server/.env.example` в `apps/server/.env` и заполнить: `DATABASE_URL` к своему Postgres, случайные `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`. Затем применить миграции:

```bash
pnpm --filter api db:migrate
```

## Запуск в разработке

Фронтенд и бэкенд вместе (заодно собирает и отслеживает `packages/shared`):

```bash
pnpm dev
```

Только фронтенд (http://localhost:5173) или только бэкенд (http://localhost:3000, API под `/api`):

```bash
pnpm dev:web
pnpm dev:api
```

При запуске по отдельности сначала соберите общие типы: `pnpm --filter shared build`.

## Тесты, линтинг, форматирование

```bash
pnpm test          # юнит-тесты web + server
pnpm lint          # ESLint (apps/web, apps/server)
pnpm format        # Prettier --write по всему репо
pnpm format:check  # Prettier --check, без изменений
```

E2E-тесты сервера (нужна доступная БД): `pnpm --filter api test:e2e`.

## База данных

Схема — `apps/server/src/database/schema/`. После её изменения:

```bash
pnpm --filter api db:generate   # создать миграцию в apps/server/drizzle/
pnpm --filter api db:migrate    # применить
```

Миграции при старте приложения не запускаются — только этими командами (в проде — автоматически при деплое).

## Деплой

Пуш в ветку `deploy` → GitHub Actions собирает Docker-образ на сервере, применяет миграции и перезапускает контейнер. Подробности — в [docs/deploy.md](docs/deploy.md).

## Документация

- [docs/server.md](docs/server.md) — бэкенд: конфигурация, БД, авторизация, безопасность, тесты
- [docs/web.md](docs/web.md) — фронтенд: структура, работа с API, стили, тесты
- [docs/monorepo.md](docs/monorepo.md) — монорепо, пакет `shared`, почему ESLint-конфиги не общие
- [docs/deploy.md](docs/deploy.md) — деплой и прод
- [CLAUDE.md](CLAUDE.md) — контекст и обязательные конвенции для Claude Code
