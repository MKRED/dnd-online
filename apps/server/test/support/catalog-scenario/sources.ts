import { describe, expect, it } from 'vitest';
import type { CatalogContext } from './catalog-scenario.types.js';

// Источники — общее поле предметов, способностей и эффектов (shared/catalogSources.ts).
export function describeSources(get: () => CatalogContext): void {
  describe('источники', () => {
    it('сохраняются, правятся, PUT без поля их стирает', async () => {
      const { author, url, body, create } = get();
      const sources = ['Книга игрока 2024, стр. 42', 'https://next.dnd.su'];
      const { id } = await create({
        sources: ['  Книга игрока 2024, стр. 42 ', sources[1]],
      });
      const card = await author.get(url(id)).expect(200);
      expect((card.body as { sources: unknown }).sources).toEqual(sources);

      const edited = await author
        .put(url(id))
        .send(body({ sources: [sources[1]] }))
        .expect(200);
      expect((edited.body as { sources: unknown }).sources).toEqual([
        sources[1],
      ]);

      const cleared = await author.put(url(id)).send(body()).expect(200);
      expect((cleared.body as { sources: unknown }).sources).toEqual([]);
    });

    it('слишком много, слишком длинный, пустой, не строка — 400', async () => {
      const { author, url, body } = get();
      for (const sources of [
        Array(11).fill('Книга'),
        ['x'.repeat(501)],
        ['  '],
        [42],
        'Книга',
      ]) {
        const res = await author
          .post(url())
          .send(body({ sources }))
          .expect(400);
        expect(JSON.stringify(res.body)).toMatch(/Источники/);
      }
    });
  });
}
