# syntax=docker/dockerfile:1

# ============================================================================
# dnd-online — единый образ: NestJS API (apps/server), который ТАКЖЕ раздаёт
# собранную статику фронтенда (apps/web). Node 24, pnpm workspaces.
# Сборка из КОРНЯ монорепо: context=. , dockerfile=Dockerfile.
# ============================================================================

# ---- build: ставим зависимости монорепо, собираем shared, server и web ----
FROM node:24-slim AS build
WORKDIR /app

# Ровно та версия pnpm, что в packageManager корневого package.json —
# иначе pnpm попытается сам переключиться на неё при запуске.
RUN npm install -g pnpm@11.22.0

# Манифесты всех workspace'ов нужны ДО install (слой с зависимостями кешируется,
# пока не меняются package.json/lock). pnpm-workspace.yaml несёт allowBuilds.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

# Полный install (с dev-зависимостями): нужны nest/tsc/vite для сборки, drizzle-kit
# для миграций и pino-pretty, которым прод-логгер пишет logs/app.log.
# Store pnpm — в BuildKit-кеше на сервере, чтобы повторные сборки не качали всё заново.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir /pnpm-store

# Исходники. Секреты (.env), node_modules, dist, logs отсекает .dockerignore.
COPY packages/shared packages/shared
COPY apps/server apps/server
COPY apps/web apps/web

# Фронтенд в проде ходит в API того же origin. VITE_* вшивается на этапе сборки,
# поэтому задаётся здесь, а не в .env на сервере.
ENV VITE_API_URL=/api

# shared — первым: и server (рантайм-импорты), и web (типы в tsc -b) зависят от его dist.
RUN pnpm --filter shared build \
 && pnpm --filter api build \
 && pnpm --filter web build

# ---- runtime ----------------------------------------------------------------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Раскладку сохраняем 1-в-1 с build-стадией: node_modules у pnpm — это симлинки
# (apps/server/node_modules/* -> ../../node_modules/.pnpm/..., shared -> packages/shared).
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
# Миграции и конфиг drizzle-kit — для шага миграций в CI (docker compose run).
COPY --from=build /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=build /app/apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts
# Статика фронтенда — туда, где её ищет web-app.module.ts (dist/../public).
COPY --from=build /app/apps/web/dist ./apps/server/public

# cwd важен: logs/app.log и out: './drizzle' резолвятся относительно него.
WORKDIR /app/apps/server

# Наружу порт не публикуем — edge-nginx ходит в контейнер по nginx-network.
EXPOSE 3000

# Переменные окружения приходят из env_file в docker-compose — .env в образе нет.
CMD ["node", "dist/main.js"]
