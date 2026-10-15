import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { characterBody } from './support/character-fixture.js';
import { createItem, itemBody, packBody } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

interface Entry {
  id: string;
  location: 'carried' | 'stash';
  quantity: number;
  item: { id: string; name: string } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}

// Правила инвентаря — docs/plan/character-inventory.md.
describe('инвентарь персонажа (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('owner');
    stranger = await t.loginAs('stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  async function createCharacter(): Promise<string> {
    const res = await owner
      .post('/api/characters')
      .send(characterBody())
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const items = (id: string) => `/api/characters/${id}/items`;

  const inventory = async (agent: request.Agent, id: string) =>
    (
      (await agent.get(`/api/characters/${id}`).expect(200)).body as {
        inventory: Entry[];
      }
    ).inventory;

  it('тот же предмет в том же месте складывается, в другом — отдельной строкой', async () => {
    const id = await createCharacter();
    const torch = await createItem(owner, { name: 'Факел' });
    const add = (quantity: number, location: string) =>
      owner
        .post(items(id))
        .send({ itemId: torch.id, quantity, location })
        .expect(201);
    await add(2, 'carried');
    await add(3, 'carried');
    await add(1, 'stash');

    const entries = await inventory(owner, id);
    expect(entries.map((e) => [e.location, e.quantity, e.item?.name])).toEqual([
      ['carried', 5, 'Факел'],
      ['stash', 1, 'Факел'],
    ]);
  });

  it('перенос части стопки, правка количества, перенос в занятое место складывает', async () => {
    const id = await createCharacter();
    const torch = await createItem(owner);
    await owner
      .post(items(id))
      .send({ itemId: torch.id, quantity: 5, location: 'carried' })
      .expect(201);
    const [carried] = await inventory(owner, id);

    await owner
      .post(`${items(id)}/${carried.id}/move`)
      .send({ location: 'stash', quantity: 2 })
      .expect(201);
    let entries = await inventory(owner, id);
    // Порядок строк здесь не проверяем — только где сколько лежит.
    expect(
      Object.fromEntries(entries.map((e) => [e.location, e.quantity])),
    ).toEqual({ carried: 3, stash: 2 });

    await owner
      .patch(`${items(id)}/${carried.id}`)
      .send({ location: 'stash' })
      .expect(200);
    entries = await inventory(owner, id);
    expect(entries.map((e) => [e.location, e.quantity])).toEqual([
      ['stash', 5],
    ]);

    await owner
      .patch(`${items(id)}/${entries[0].id}`)
      .send({})
      .expect(400);
    await owner.delete(`${items(id)}/${entries[0].id}`).expect(200);
    expect(await inventory(owner, id)).toEqual([]);
  });

  it('чужой скрытый предмет не положить; скрытый после — строка без карточки', async () => {
    const id = await createCharacter();
    const hidden = await createItem(stranger, { name: 'Тайна' });
    await owner
      .post(items(id))
      .send({ itemId: hidden.id, quantity: 1, location: 'carried' })
      .expect(400);

    const lamp = await createItem(stranger, {
      name: 'Лампа',
      isPublic: true,
    });
    await owner
      .post(items(id))
      .send({ itemId: lamp.id, quantity: 1, location: 'carried' })
      .expect(201);
    await stranger
      .put(`/api/items/${lamp.id}`)
      .send(itemBody({ name: 'Лампа', isPublic: false }))
      .expect(200);
    const [entry] = await inventory(owner, id);
    expect(entry).toMatchObject({ item: null, missing: 'hidden' });
    expect(JSON.stringify(entry)).not.toContain('Лампа');

    await stranger.delete(`/api/items/${lamp.id}`).expect(204);
    expect((await inventory(owner, id))[0]).toMatchObject({
      item: null,
      missing: 'deleted',
    });
  });

  it('чужой не меняет инвентарь, даже если лист открыт по ссылке', async () => {
    const id = await createCharacter();
    const torch = await createItem(owner, { isPublic: true });
    await owner
      .post(items(id))
      .send({ itemId: torch.id, quantity: 1, location: 'carried' })
      .expect(201);
    await owner
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);
    const [entry] = await inventory(stranger, id);

    await stranger
      .post(items(id))
      .send({ itemId: torch.id, quantity: 1, location: 'carried' })
      .expect(404);
    await stranger
      .patch(`${items(id)}/${entry.id}`)
      .send({ quantity: 9 })
      .expect(404);
    await stranger.delete(`${items(id)}/${entry.id}`).expect(404);
    expect((await inventory(owner, id))[0].quantity).toBe(1);
  });

  it('зритель по ссылке не видит скрытый от него предмет владельца', async () => {
    const id = await createCharacter();
    const secret = await createItem(owner, { name: 'Дневник' });
    await owner
      .post(items(id))
      .send({ itemId: secret.id, quantity: 1, location: 'carried' })
      .expect(201);
    await owner
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);
    expect((await inventory(owner, id))[0].item?.name).toBe('Дневник');
    const [seen] = await inventory(stranger, id);
    expect(seen).toMatchObject({ item: null, missing: 'hidden' });
    expect(JSON.stringify(seen)).not.toContain('Дневник');
  });

  it('распаковка набора кладёт видимый состав × число наборов', async () => {
    const id = await createCharacter();
    const torch = await createItem(owner, { name: 'Факел', isPublic: true });
    const rope = await createItem(owner, { name: 'Верёвка', isPublic: true });
    const pack = await owner
      .post('/api/items')
      .send(
        packBody(
          [
            { itemId: torch.id, quantity: 10 },
            { itemId: rope.id, quantity: 1 },
          ],
          { isPublic: true },
        ),
      )
      .expect(201);
    await owner
      .put(`/api/items/${rope.id}`)
      .send(itemBody({ name: 'Верёвка', isPublic: false, hidePacks: false }))
      .expect(200);

    // Набор чужой для stranger: его скрытая верёвка не должна попасть к нему.
    const res = await stranger
      .post('/api/characters')
      .send(characterBody())
      .expect(201);
    const theirs = (res.body as { id: string }).id;
    await stranger
      .post(items(theirs))
      .send({
        itemId: (pack.body as { id: string }).id,
        quantity: 2,
        location: 'carried',
        unpack: true,
      })
      .expect(201);
    const entries = await inventory(stranger, theirs);
    expect(entries.map((e) => [e.item?.name, e.quantity])).toEqual([
      ['Факел', 20],
    ]);

    // Целиком — одна строка с самим набором.
    await owner
      .post(items(id))
      .send({
        itemId: (pack.body as { id: string }).id,
        quantity: 1,
        location: 'carried',
      })
      .expect(201);
    expect((await inventory(owner, id)).map((e) => e.item?.name)).toEqual([
      'Набор путешественника',
    ]);
  });

  it('неверные данные — 400', async () => {
    const id = await createCharacter();
    const torch = await createItem(owner);
    for (const body of [
      { itemId: 'x', quantity: 1, location: 'carried' },
      { itemId: torch.id, quantity: 0, location: 'carried' },
      { itemId: torch.id, quantity: 1, location: 'pocket' },
    ]) {
      await owner.post(items(id)).send(body).expect(400);
    }
  });
});
