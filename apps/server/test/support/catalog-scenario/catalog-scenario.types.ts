import type request from 'supertest';

export interface CatalogScenario {
  // Путь API без /api: items, abilities, effects.
  path: string;
  // Тело, которое сервер примет; поверх него тесты меняют отдельные поля.
  body: Record<string, unknown>;
}

export interface CatalogContext {
  author: request.Agent;
  stranger: request.Agent;
  anonymous: request.Agent;
  url: (id?: string) => string;
  body: (over?: Record<string, unknown>) => Record<string, unknown>;
  create: (over?: Record<string, unknown>) => Promise<{ id: string }>;
}
