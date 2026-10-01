import { DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';

// Собранный фронтенд (apps/web/dist) Docker-образ кладёт в apps/server/public —
// тогда Nest отдаёт и SPA, и API с одного origin (без CORS и проблем с cookie).
const WEB_ROOT = join(import.meta.dirname, '..', 'public');

// В dev (vite на :5173) и в тестах папки public нет — модуль не подключаем вовсе,
// иначе SPA-фоллбэк отвечал бы на неизвестные пути ошибкой отсутствия index.html.
export function webAppModules(): DynamicModule[] {
  if (!existsSync(WEB_ROOT)) return [];
  return [
    ServeStaticModule.forRoot({
      rootPath: WEB_ROOT,
      // /api/* — только API: неизвестный API-роут должен дать 404 JSON, а не index.html.
      exclude: ['/api/{*path}'],
    }),
  ];
}
