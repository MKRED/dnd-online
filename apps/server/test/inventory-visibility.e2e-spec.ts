import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createCharacter as createCharacterOf,
  inventoryUrl as items,
  readInventory as inventory,
} from './support/inventory-fixture.js';
import { createItem, itemBody } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Что видно и кому можно менять — docs/plan/done/character-inventory.md.
describe('инвентарь: скрытое, удалённое и чужие (e2e)', () => {
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

  const createCharacter = () => createCharacterOf(owner);

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
});
