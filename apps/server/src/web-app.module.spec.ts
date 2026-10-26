import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Server } from 'http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { webAppModules } from './web-app.module.js';

// Раздача собранного фронтенда: в e2e её нет (папки public там нет), поэтому проверяем
// модуль на временной папке с index.html и одним «чанком».
describe('webAppModules', () => {
  let root: string;
  let app: INestApplication<Server>;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'web-app-'));
    mkdirSync(join(root, 'assets'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>t</title>');
    writeFileSync(join(root, 'assets', 'Page-abc123.js'), 'export {};');

    @Module({ imports: webAppModules(root) })
    class TestWebModule {}

    // NestFactory, а не Test.createTestingModule: ServeStaticModule выбирает загрузчик по
    // HTTP-адаптеру при сборке модуля, а у тестового модуля адаптера тогда ещё нет.
    app = await NestFactory.create<INestApplication<Server>>(TestWebModule, {
      logger: false,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('отдаёт index.html на путь SPA и просит сверять его с сервером', async () => {
    const res = await request(app.getHttpServer())
      .get('/monsters/1')
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('кэширует файлы с хешем навсегда', async () => {
    const res = await request(app.getHttpServer())
      .get('/assets/Page-abc123.js')
      .expect(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('на чанк, которого нет (старая вкладка после деплоя), отвечает 404, а не index.html', async () => {
    const res = await request(app.getHttpServer())
      .get('/assets/MonsterModelPreview-C4xEdi6c.js')
      .expect(404);
    expect(res.headers['content-type']).not.toMatch(/text\/html/);
  });

  it('без папки public ничего не подключает', () => {
    expect(webAppModules(join(root, 'missing'))).toEqual([]);
  });
});
