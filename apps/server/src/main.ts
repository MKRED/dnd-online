import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  // В проде перед нами ровно один прокси (edge-nginx), он дописывает IP клиента в
  // X-Forwarded-For. Без этого req.ip — адрес nginx, и rate limit на /auth был бы
  // общим на всех пользователей сразу.
  app.set('trust proxy', 1);
  // Дефолтный CSP helmet уже подходит SPA: скрипты только с 'self', стили и шрифты
  // с https: (Google Fonts) и 'unsafe-inline' (Mantine вставляет <style> в рантайме).
  // upgrade-insecure-requests выключаем вне прода: при локальном запуске собранного
  // сервера по http браузер иначе пытался бы грузить ассеты по https.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests:
            process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  // Все API-роуты под /api: в проде SPA отдаётся с того же origin, и без префикса
  // SPA-роут /characters конфликтовал бы с API-роутом /characters.
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
