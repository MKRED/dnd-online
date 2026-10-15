import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { DatabaseService } from '../../src/database/database.service.js';
import { assertTestDatabaseName } from './test-database.js';

export const TEST_PASSWORD = 'test-password';

export interface TestApp {
  app: NestExpressApplication;
  // Агент supertest с куками пользователя: регистрирует его при первом вызове.
  loginAs(login: string): Promise<request.Agent>;
  anonymous(): request.Agent;
  close(): Promise<void>;
}

// Весь сервер с настоящей тестовой базой, очищенной перед файлом тестов. Лимит частоты
// входа выключен: тесты регистрируют пользователей быстрее, чем пустил бы прод.
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  await resetDatabase(app.get(DatabaseService));

  const server = app.getHttpServer();
  return {
    app,
    async loginAs(login) {
      const agent = request.agent(server);
      await agent
        .post('/api/auth/register')
        .send({ login, nickname: login, password: TEST_PASSWORD })
        .expect(201);
      return agent;
    },
    anonymous: () => request.agent(server),
    close: () => app.close(),
  };
}

// Ещё раз сверяем имя базы уже у живого соединения: очистка — последнее место, где
// ошибка в настройке окружения стоила бы данных.
async function resetDatabase(database: DatabaseService): Promise<void> {
  const { rows } = await database.db.execute<{ name: string }>(
    sql`select current_database() as name`,
  );
  assertTestDatabaseName(rows[0].name);
  const tables = await database.db.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public'`,
  );
  if (tables.rows.length === 0) return;
  const list = tables.rows.map((t) => `"${t.name}"`).join(', ');
  await database.db.execute(
    sql.raw(`truncate ${list} restart identity cascade`),
  );
}
