# dnd-online

Онлайн-платформа для игры в DnD с друзьями: 3D-карта (Three.js), обновления в реальном времени (WebSocket), персистентность в Postgres.

## Стек

- **apps/web** — фронтенд: Vite + React + TypeScript, react-three-fiber (3D-карта), Mantine (UI)
- **apps/server** — бэкенд: NestJS + TypeScript, Socket.IO (реалтайм), Drizzle + Postgres, pino (логирование)
- **packages/shared** — общие типы (события сокетов, игровые сущности), используются и фронтом, и бэком

Пакетный менеджер — pnpm workspaces.

## Установка

```bash
pnpm install
```

## Запуск в разработке

Фронтенд и бэкенд вместе:

```bash
pnpm dev
```

Только фронтенд (http://localhost:5173):

```bash
pnpm dev:web
```

Только бэкенд (http://localhost:3000):

```bash
pnpm dev:api
```

## Линтинг и форматирование

```bash
pnpm lint          # ESLint (apps/web, apps/server)
pnpm format        # Prettier --write по всему репо
pnpm format:check  # Prettier --check, без изменений
```

Правила форматирования (`.prettierrc`) общие на весь репозиторий. У каждого приложения свой `eslint.config.mjs` — типизированный линтинг (`typescript-eslint` c `projectService`) требует, чтобы конфиг лежал в том же приложении, что и его `tsconfig.json`; расшаренный конфиг ломает резолвинг типов для файлов вроде тестов (Jest-глобалы `describe`/`it`/`expect` резолвятся как `any`).
