import { eq } from 'drizzle-orm';
import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database/database.service.js';
import { monsterEffects, monsterItems } from '../src/database/schema/index.js';
import { createItem, itemBody } from './support/item-fixture.js';
import { createMonster } from './support/monster-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Снаряжение и эффекты монстра — docs/plan/done/monsters-npcs.md, этап 6.
interface ItemRow {
  id: string;
  quantity: number;
  item: { id: string; name: string; weight: number } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}
interface EffectRow {
  id: string;
  effect: { id: string; name: string } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}

const effectBody = (over: Record<string, unknown> = {}) => ({
  name: 'Каменная кожа',
  components: [{ kind: 'armor_class', change: 'bonus', value: 2 }],
  description: '',
  isPublic: false,
  duration: { kind: 'permanent' },
  saveEnds: null,
  ...over,
});

const itemsUrl = (monsterId: string) => `/api/monsters/${monsterId}/items`;
const effectsUrl = (monsterId: string) => `/api/monsters/${monsterId}/effects`;
const message = (res: { body: unknown }) =>
  (res.body as { message: string | string[] }).message;

describe('снаряжение и эффекты монстра (e2e)', () => {
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

  const card = async (agent: request.Agent, monsterId: string) => {
    const res = await agent.get(`/api/monsters/${monsterId}`).expect(200);
    return res.body as { items: ItemRow[]; effects: EffectRow[] };
  };
  const createEffect = async (agent: request.Agent, body: object) => {
    const res = await agent.post('/api/effects').send(body).expect(201);
    return (res.body as { id: string }).id;
  };

  describe('снаряжение', () => {
    it('добавить, повтор — 409, сменить количество, убрать', async () => {
      const id = await createMonster(owner);
      const dagger = await createItem(owner, { name: 'Кинжал', weight: 1 });
      const added = await owner
        .post(itemsUrl(id))
        .send({ itemId: dagger.id, quantity: 2 })
        .expect(201);
      expect(added.body).toEqual([
        {
          id: expect.any(String) as string,
          quantity: 2,
          item: {
            id: dagger.id,
            name: 'Кинжал',
            category: 'basic',
            rarity: 'none',
            weight: 1,
            isPublic: false,
            image: null,
            // Не экипировка — мест на кукле нет.
            equip: null,
          },
          missing: null,
          inactive: false,
        },
      ]);
      expect((await card(owner, id)).items).toEqual(added.body);
      // Список каталога связей не несёт: они только в карточке.
      const list = await owner.get('/api/monsters?scope=mine').expect(200);
      const listed = (list.body as { id: string }[]).find((m) => m.id === id);
      expect(listed).not.toHaveProperty('items');
      expect(listed).not.toHaveProperty('effects');

      const again = await owner
        .post(itemsUrl(id))
        .send({ itemId: dagger.id, quantity: 1 })
        .expect(409);
      expect(message(again)).toBe('Предмет уже есть в снаряжении');

      const [entry] = added.body as ItemRow[];
      const changed = await owner
        .patch(`${itemsUrl(id)}/${entry.id}`)
        .send({ quantity: 5 })
        .expect(200);
      expect((changed.body as ItemRow[])[0].quantity).toBe(5);
      const removed = await owner
        .delete(`${itemsUrl(id)}/${entry.id}`)
        .expect(200);
      expect(removed.body).toEqual([]);
      await owner.delete(`${itemsUrl(id)}/${entry.id}`).expect(404);
    });

    it('количество не 1–9999 и невидимый предмет — 400', async () => {
      const id = await createMonster(owner);
      const torch = await createItem(owner);
      for (const quantity of [0, 10000, 1.5, '2']) {
        const res = await owner
          .post(itemsUrl(id))
          .send({ itemId: torch.id, quantity })
          .expect(400);
        expect(message(res)).toContain('Количество — целое, от 1 до 9999');
      }
      const hidden = await createItem(stranger);
      for (const itemId of ['nope', crypto.randomUUID(), hidden.id])
        await owner
          .post(itemsUrl(id))
          .send({ itemId, quantity: 1 })
          .expect(400);
      const entry = (
        (
          await owner
            .post(itemsUrl(id))
            .send({ itemId: torch.id, quantity: 1 })
            .expect(201)
        ).body as ItemRow[]
      )[0];
      await owner
        .patch(`${itemsUrl(id)}/${entry.id}`)
        .send({ quantity: 0 })
        .expect(400);
    });

    it('скрытый после добавления — заглушка; удалённый — «удалён»', async () => {
      const id = await createMonster(owner, true);
      const sword = await createItem(stranger, {
        name: 'Тайный меч',
        isPublic: true,
      });
      await owner
        .post(itemsUrl(id))
        .send({ itemId: sword.id, quantity: 1 })
        .expect(201);
      await stranger
        .put(`/api/items/${sword.id}`)
        .send(itemBody({ name: 'Тайный меч', isPublic: false }))
        .expect(200);
      const [row] = (await card(owner, id)).items;
      expect(row).toMatchObject({ item: null, missing: 'hidden', quantity: 1 });
      expect(JSON.stringify(row)).not.toContain('Тайный меч');
      // Автор предмета видит его на чужом монстре, но тот не действует.
      expect((await card(stranger, id)).items[0]).toMatchObject({
        item: { name: 'Тайный меч' },
        inactive: true,
      });
      await stranger.delete(`/api/items/${sword.id}`).expect(204);
      expect((await card(owner, id)).items[0]).toMatchObject({
        item: null,
        missing: 'deleted',
      });
    });
  });

  describe('эффекты', () => {
    it('наложить, повтор — 409, снять; невидимый — 400', async () => {
      const id = await createMonster(owner);
      const effectId = await createEffect(owner, effectBody());
      const added = await owner
        .post(effectsUrl(id))
        .send({ effectId })
        .expect(201);
      expect(added.body).toEqual([
        {
          id: expect.any(String) as string,
          effect: {
            id: effectId,
            name: 'Каменная кожа',
            isPublic: false,
            image: null,
            components: [{ kind: 'armor_class', change: 'bonus', value: 2 }],
            duration: { kind: 'permanent' },
            saveEnds: null,
          },
          missing: null,
          inactive: false,
        },
      ]);
      expect((await card(owner, id)).effects).toEqual(added.body);
      const again = await owner
        .post(effectsUrl(id))
        .send({ effectId })
        .expect(409);
      expect(message(again)).toBe('Эффект уже наложен');

      const hidden = await createEffect(stranger, effectBody());
      for (const bad of ['nope', crypto.randomUUID(), hidden])
        await owner.post(effectsUrl(id)).send({ effectId: bad }).expect(400);

      const [entry] = added.body as EffectRow[];
      await owner.delete(`${effectsUrl(id)}/${entry.id}`).expect(200);
      await owner.delete(`${effectsUrl(id)}/${entry.id}`).expect(404);
    });

    it('скрытый после наложения — заглушка; удалённый — «удалён»', async () => {
      const id = await createMonster(owner, true);
      const effectId = await createEffect(
        stranger,
        effectBody({ name: 'Тайная кожа', isPublic: true }),
      );
      await owner.post(effectsUrl(id)).send({ effectId }).expect(201);
      await stranger
        .put(`/api/effects/${effectId}`)
        .send(effectBody({ name: 'Тайная кожа', isPublic: false }))
        .expect(200);
      const [row] = (await card(owner, id)).effects;
      expect(row).toMatchObject({ effect: null, missing: 'hidden' });
      expect(JSON.stringify(row)).not.toContain('Тайная кожа');
      expect((await card(stranger, id)).effects[0]).toMatchObject({
        effect: { name: 'Тайная кожа' },
        inactive: true,
      });
      await stranger.delete(`/api/effects/${effectId}`).expect(204);
      expect((await card(owner, id)).effects[0]).toMatchObject({
        effect: null,
        missing: 'deleted',
      });
    });
  });

  it('аноним — 401; чужой опубликованный — 403, скрытый — 404', async () => {
    const hidden = await createMonster(owner, false);
    const published = await createMonster(owner, true);
    const item = await createItem(stranger, { isPublic: true });
    const effectId = await createEffect(
      stranger,
      effectBody({ isPublic: true }),
    );
    const itemBodyOk = { itemId: item.id, quantity: 1 };
    const itemEntry = (
      (await owner.post(itemsUrl(published)).send(itemBodyOk).expect(201))
        .body as ItemRow[]
    )[0];
    const effectEntry = (
      (await owner.post(effectsUrl(published)).send({ effectId }).expect(201))
        .body as EffectRow[]
    )[0];

    await t.anonymous().post(itemsUrl(published)).send(itemBodyOk).expect(401);
    await t
      .anonymous()
      .post(effectsUrl(published))
      .send({ effectId })
      .expect(401);
    const forbidden = await stranger
      .post(itemsUrl(published))
      .send(itemBodyOk)
      .expect(403);
    expect(message(forbidden)).toBe('Менять монстра может только его автор');
    await stranger
      .patch(`${itemsUrl(published)}/${itemEntry.id}`)
      .send({ quantity: 3 })
      .expect(403);
    await stranger.delete(`${itemsUrl(published)}/${itemEntry.id}`).expect(403);
    await stranger.post(effectsUrl(published)).send({ effectId }).expect(403);
    await stranger
      .delete(`${effectsUrl(published)}/${effectEntry.id}`)
      .expect(403);
    await stranger.post(itemsUrl(hidden)).send(itemBodyOk).expect(404);
    await stranger.post(effectsUrl(hidden)).send({ effectId }).expect(404);
    // Чужой видит снаряжение и эффекты опубликованного монстра в карточке.
    const seen = await card(stranger, published);
    expect(seen.items).toHaveLength(1);
    expect(seen.effects).toHaveLength(1);
  });

  it('удаление монстра убирает его снаряжение и эффекты', async () => {
    const id = await createMonster(owner);
    const item = await createItem(owner);
    const effectId = await createEffect(owner, effectBody());
    await owner
      .post(itemsUrl(id))
      .send({ itemId: item.id, quantity: 1 })
      .expect(201);
    await owner.post(effectsUrl(id)).send({ effectId }).expect(201);
    await owner.delete(`/api/monsters/${id}`).expect(204);
    const { db } = t.app.get(DatabaseService);
    expect(
      await db
        .select()
        .from(monsterItems)
        .where(eq(monsterItems.monsterId, id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(monsterEffects)
        .where(eq(monsterEffects.monsterId, id)),
    ).toEqual([]);
    await owner.get(`/api/items/${item.id}`).expect(200);
    await owner.get(`/api/effects/${effectId}`).expect(200);
  });
});
