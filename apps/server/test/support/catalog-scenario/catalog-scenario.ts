import { afterAll, beforeAll, describe } from 'vitest';
import { createTestApp, type TestApp } from '../test-app.js';
import { describeAccess } from './access.js';
import type {
  CatalogContext,
  CatalogScenario,
} from './catalog-scenario.types.js';
import { describeImage } from './image.js';

// Общее для каталогов предметов, способностей и эффектов: доступ к скрытым и
// опубликованным записям, общие поля и картинка. Свои поля каталога файл проверяет
// сам через fields(ctx).
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
      const url = (id?: string) =>
        id ? `/api/${scenario.path}/${id}` : `/api/${scenario.path}`;
      const body = (over: Record<string, unknown> = {}) => ({
        ...scenario.body,
        ...over,
      });
      ctx = {
        author,
        stranger: await t.loginAs('stranger'),
        anonymous: t.anonymous(),
        url,
        body,
        async create(over) {
          const res = await author.post(url()).send(body(over)).expect(201);
          return res.body as { id: string };
        },
      };
    });

    afterAll(async () => {
      await t.close();
    });

    describeAccess(() => ctx);
    describeImage(() => ctx);
    fields?.(() => ctx);
  });
}
