import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createItem,
  packBody,
  readItem,
  type PackCard,
} from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Правила состава наборов — docs/plan/done/item-packs.md.
describe('наборы снаряжения: состав (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('author');
    stranger = await t.loginAs('stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  const card = readItem;

  it('состав сохраняется по порядку, с карточками предметов', async () => {
    const torch = await createItem(author, { name: 'Факел' });
    const rope = await createItem(author, { name: 'Верёвка' });
    const res = await author
      .post('/api/items')
      .send(
        packBody([
          { itemId: rope.id, quantity: 1 },
          { itemId: torch.id, quantity: 10 },
        ]),
      )
      .expect(201);
    const pack = await card(author, (res.body as PackCard).id);
    expect(pack.details.contents).toMatchObject([
      { itemId: rope.id, quantity: 1, item: { name: 'Верёвка' } },
      { itemId: torch.id, quantity: 10, item: { name: 'Факел' } },
    ]);
  });

  it('пустой состав, повтор строки, набор в наборе и чужой скрытый предмет — 400', async () => {
    const torch = await createItem(author);
    const inner = await author
      .post('/api/items')
      .send(packBody([{ itemId: torch.id, quantity: 1 }]))
      .expect(201);
    const foreignHidden = await createItem(stranger, { name: 'Тайна' });

    for (const contents of [
      [],
      [
        { itemId: torch.id, quantity: 1 },
        { itemId: torch.id, quantity: 2 },
      ],
      [{ itemId: (inner.body as PackCard).id, quantity: 1 }],
      [{ itemId: foreignHidden.id, quantity: 1 }],
      [{ itemId: torch.id, quantity: 0 }],
    ]) {
      await author.post('/api/items').send(packBody(contents)).expect(400);
    }
  });

  it('удалённый предмет пропадает из наборов', async () => {
    const torch = await createItem(author);
    const rope = await createItem(author);
    const res = await author
      .post('/api/items')
      .send(
        packBody([
          { itemId: torch.id, quantity: 1 },
          { itemId: rope.id, quantity: 1 },
        ]),
      )
      .expect(201);
    await author.delete(`/api/items/${torch.id}`).expect(204);
    const pack = await card(author, (res.body as PackCard).id);
    expect(pack.details.contents.map((e) => e.itemId)).toEqual([rope.id]);
  });
});
