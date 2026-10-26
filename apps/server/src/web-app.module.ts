import { DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { ServerResponse } from 'http';
import { existsSync } from 'fs';
import { join, sep } from 'path';

// Собранный фронтенд (apps/web/dist) Docker-образ кладёт в apps/server/public —
// тогда Nest отдаёт и SPA, и API с одного origin (без CORS и проблем с cookie).
const WEB_ROOT = join(import.meta.dirname, '..', 'public');

// Файлы в assets/ Vite называет с хешем содержимого, их можно кэшировать навсегда.
// Всё остальное (index.html прежде всего) браузер сверяет с сервером при каждом
// открытии, иначе после деплоя он держал бы index со ссылками на старые файлы.
function setCacheHeaders(res: ServerResponse, path: string) {
  const hashed = path.includes(`${sep}assets${sep}`);
  res.setHeader(
    'Cache-Control',
    hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  );
}

// В dev (vite на :5173) и в тестах папки public нет — модуль не подключаем вовсе,
// иначе SPA-фоллбэк отвечал бы на неизвестные пути ошибкой отсутствия index.html.
export function webAppModules(rootPath = WEB_ROOT): DynamicModule[] {
  if (!existsSync(rootPath)) return [];
  return [
    ServeStaticModule.forRoot({
      rootPath,
      // /api/* — только API: неизвестный API-роут должен дать 404 JSON, а не index.html.
      // /assets/* — тоже 404: файл, которого нет, просит вкладка, открытая до деплоя, и
      // index.html вместо скрипта браузер принял бы за ошибку MIME, а не «нет файла».
      exclude: ['/api/{*path}', '/assets/{*path}'],
      serveStaticOptions: { setHeaders: setCacheHeaders },
    }),
  ];
}
