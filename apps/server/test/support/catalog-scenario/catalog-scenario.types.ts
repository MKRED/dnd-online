import type { NestExpressApplication } from '@nestjs/platform-express';
import type request from 'supertest';
import type { TokenClient } from '../api-token.js';

export interface CatalogScenario {
  // Путь API без /api: items, abilities, effects.
  path: string;
  // Тело, которое сервер примет; поверх него тесты меняют отдельные поля.
  body: Record<string, unknown>;
  // Свои поля каталога, которые сервер обязан отклонить (400).
  invalid: Record<string, unknown>;
  // Записи, без которых тело не примут, — до всех тестов, от имени автора: у
  // обстановки это своя модель (docs/plan/blocks.md, этап 8б). Возвращает поля поверх body.
  prepare?: (author: request.Agent) => Promise<Record<string, unknown>>;
}

export interface CatalogContext {
  // Приложение — для тестов, которым нужна база напрямую (старые записи).
  app: NestExpressApplication;
  author: request.Agent;
  stranger: request.Agent;
  anonymous: request.Agent;
  // API-токены автора и чужого: запросы без кук.
  authorToken: TokenClient;
  strangerToken: TokenClient;
  url: (id?: string) => string;
  body: (over?: Record<string, unknown>) => Record<string, unknown>;
  create: (over?: Record<string, unknown>) => Promise<{ id: string }>;
  invalid: Record<string, unknown>;
}
