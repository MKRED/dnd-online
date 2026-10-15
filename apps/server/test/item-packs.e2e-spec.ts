import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createItem, itemBody, packBody } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

interface PackCard {
  id: string;
  isPublic: boolean;
  details: {
    contents: {
      itemId: string;
      quantity: number;
      item: { name: string } | null;
    }[];
  };
  packs?: { mine: { id: string }[]; othersCount: number };
}

// Правила наборов — docs/plan/item-packs.md.
describe('наборы снаряжения (e2e)', () => {
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

  const card = async (agent: request.Agent, id: string) =>
    (await agent.get(`/api/items/${id}`).expect(200)).body as PackCard;

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

  it('опубликовать набор со скрытым составом нельзя — 409; с publishContents публикуется всё', async () => {
    const torch = await createItem(author, { name: 'Факел' });
    const body = packBody([{ itemId: torch.id, quantity: 1 }], {
      isPublic: true,
    });
    const refused = await author.post('/api/items').send(body).expect(409);
    expect((refused.body as { message: string }).message).toContain('Факел');

    const res = await author
      .post('/api/items')
      .send({ ...body, publishContents: true })
      .expect(201);
    expect((res.body as PackCard).isPublic).toBe(true);
    expect((await card(stranger, torch.id)).isPublic).toBe(true);
  });

  it('скрытый автором предмет в чужом наборе — строка без карточки', async () => {
    const rope = await createItem(stranger, {
      name: 'Чужая верёвка',
      isPublic: true,
    });
    const res = await author
      .post('/api/items')
      .send(packBody([{ itemId: rope.id, quantity: 2 }], { isPublic: true }))
      .expect(201);
    const packId = (res.body as PackCard).id;

    await stranger
      .put(`/api/items/${rope.id}`)
      .send(itemBody({ name: 'Чужая верёвка', isPublic: false }))
      .expect(200);
    const pack = await card(author, packId);
    expect(pack.isPublic).toBe(true);
    expect(pack.details.contents).toEqual([
      { itemId: rope.id, quantity: 2, item: null },
    ]);
  });

  it('автор видит, в каких наборах лежит его предмет; чужим это не отдаётся', async () => {
    const torch = await createItem(author, { isPublic: true });
    const mine = await author
      .post('/api/items')
      .send(packBody([{ itemId: torch.id, quantity: 1 }]))
      .expect(201);
    await stranger
      .post('/api/items')
      .send(packBody([{ itemId: torch.id, quantity: 3 }]))
      .expect(201);

    const own = await card(author, torch.id);
    expect(own.packs).toEqual({
      mine: [expect.objectContaining({ id: (mine.body as PackCard).id })],
      othersCount: 1,
    });
    expect((await card(stranger, torch.id)).packs).toBeUndefined();
  });

  it('hidePacks скрывает вместе с предметом свои опубликованные наборы', async () => {
    const torch = await createItem(author, { isPublic: true });
    const res = await author
      .post('/api/items')
      .send(packBody([{ itemId: torch.id, quantity: 1 }], { isPublic: true }))
      .expect(201);
    await author
      .put(`/api/items/${torch.id}`)
      .send(itemBody({ isPublic: false, hidePacks: true }))
      .expect(200);
    expect((await card(author, (res.body as PackCard).id)).isPublic).toBe(
      false,
    );
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
