import { afterAll, beforeAll, describe } from 'vitest';
import { issueApiToken } from '../api-token.js';
import { createTestApp, type TestApp } from '../test-app.js';
import { describeAccess } from './access.js';
import type {
  CatalogContext,
  CatalogScenario,
} from './catalog-scenario.types.js';
import { describeImage } from './image.js';
import { describeSources } from './sources.js';
import { describeTokenAccess } from './token.js';

// Общее для каталогов предметов, способностей, эффектов и монстров: доступ к скрытым и
// опубликованным записям, общие поля, источники, картинка и доступ по API-токену. Свои
// поля каталога файл проверяет сам через fields(ctx).
export function describeCatalog(
  scenario: CatalogScenario,
  fields?: (ctx: () => CatalogContext) => void,
): void {
  describe(`каталог ${scenario.path} (e2e)`, () => {
    let t: TestApp;
    let ctx: CatalogContext;

    beforeAll(async () => {
      t = await createTestApp();
      const author = await t.loginAs('author');
      const stranger = await t.loginAs('stranger');
      const url = (id?: string) =>
        id ? `/api/${scenario.path}/${id}` : `/api/${scenario.path}`;
      const body = (over: Record<string, unknown> = {}) => ({
        ...scenario.body,
        ...over,
      });
      ctx = {
        app: t.app,
        author,
        stranger,
        anonymous: t.anonymous(),
        authorToken: await issueApiToken(t.app, author),
        strangerToken: await issueApiToken(t.app, stranger),
        url,
        body,
        async create(over) {
          const res = await author.post(url()).send(body(over)).expect(201);
          return res.body as { id: string };
        },
        invalid: scenario.invalid,
      };
    });

    afterAll(async () => {
      await t.close();
    });

    describeAccess(() => ctx);
    describeImage(() => ctx);
    describeSources(() => ctx);
    describeTokenAccess(() => ctx);
    fields?.(() => ctx);
  });
}
