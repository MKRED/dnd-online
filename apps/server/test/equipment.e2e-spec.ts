import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  attunementUrl,
  createRing,
  createShield,
  createWeapon,
  equipmentUrl as slotUrl,
  weaponDetails,
} from './support/equipment-fixture.js';
import {
  createCharacter as createCharacterOf,
  inventoryUrl as items,
} from './support/inventory-fixture.js';
import { createItem, itemBody } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

interface Row {
  id: string;
  location: 'carried' | 'stash';
  quantity: number;
  equipped: string[];
  attuned: boolean;
  item: { id: string; name: string } | null;
}

// Кукла и настройка — docs/plan/equipment.md, этап 2; правила — docs/dnd/weapons-armor.md.
describe('кукла персонажа (e2e)', () => {
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

  // Персонаж с вещами «При себе»: строки в порядке items.
  async function character(...things: { id: string }[]) {
    const id = await createCharacterOf(owner);
    for (const thing of things) {
      await owner
        .post(items(id))
        .send({ itemId: thing.id, quantity: 1, location: 'carried' })
        .expect(201);
    }
    const res = await owner.get(`/api/characters/${id}`).expect(200);
    const rows = (res.body as { inventory: Row[] }).inventory;
    return { id, rows };
  }

  const equip = (id: string, slot: string, entryId: string) =>
    owner.put(slotUrl(id, slot)).send({ entryId });
  const worn = (rows: Row[]): Record<string, string[]> =>
    Object.fromEntries(
      rows
        .filter((r) => r.equipped.length > 0)
        .map((r): [string, string[]] => [r.item?.name ?? '', r.equipped]),
    );

  it('надевает, отдаёт инвентарь с надетым и снимает', async () => {
    const sword = await createWeapon(owner, 'Длинный меч');
    const shield = await createShield(owner);
    const { id, rows } = await character(sword, shield);

    await equip(id, 'meleeMain', rows[0].id).expect(200);
    const res = await equip(id, 'meleeOff', rows[1].id).expect(200);
    expect(worn(res.body as Row[])).toEqual({
      'Длинный меч': ['meleeMain'],
      Щит: ['meleeOff'],
    });

    const off = await owner.delete(slotUrl(id, 'meleeOff')).expect(200);
    expect(worn(off.body as Row[])).toEqual({ 'Длинный меч': ['meleeMain'] });
    // Пустое место снимается без ошибки.
    await owner.delete(slotUrl(id, 'meleeOff')).expect(200);
  });

  it('двуручное снимает щит, а во вторую руку при нём нельзя', async () => {
    const greatsword = await createWeapon(owner, 'Двуручный меч', {
      properties: ['heavy', 'twoHanded'],
    });
    const shield = await createShield(owner);
    const { id, rows } = await character(greatsword, shield);

    await equip(id, 'meleeOff', rows[1].id).expect(200);
    const res = await equip(id, 'meleeMain', rows[0].id).expect(200);
    expect(worn(res.body as Row[])).toEqual({ 'Двуручный меч': ['meleeMain'] });

    const busy = await equip(id, 'meleeOff', rows[1].id).expect(400);
    expect((busy.body as { message: string }).message).toBe(
      'Вторая рука занята двуручным оружием',
    );
    // Двуручное во вторую руку не ложится вовсе.
    await equip(id, 'meleeOff', rows[0].id).expect(400);
  });

  it('единственная вещь переезжает, стопка из двух держится в обеих руках', async () => {
    const dagger = await createWeapon(owner, 'Кинжал', {
      properties: ['finesse', 'light'],
    });
    const { id, rows } = await character(dagger);

    await equip(id, 'meleeMain', rows[0].id).expect(200);
    let res = await equip(id, 'meleeOff', rows[0].id).expect(200);
    expect(worn(res.body as Row[])).toEqual({ Кинжал: ['meleeOff'] });

    await owner
      .patch(`${items(id)}/${rows[0].id}`)
      .send({ quantity: 2 })
      .expect(200);
    res = await equip(id, 'meleeMain', rows[0].id).expect(200);
    expect(worn(res.body as Row[])).toEqual({
      Кинжал: ['meleeMain', 'meleeOff'],
    });

    // Стало меньше, чем мест, — лишнее место освобождается.
    res = await owner
      .patch(`${items(id)}/${rows[0].id}`)
      .send({ quantity: 1 })
      .expect(200);
    expect(worn(res.body as Row[])).toEqual({ Кинжал: ['meleeMain'] });
  });

  it('вещь в хранилище не надеть, а ушедшая туда снимается', async () => {
    const sword = await createWeapon(owner, 'Меч');
    const { id, rows } = await character(sword);
    await equip(id, 'meleeMain', rows[0].id).expect(200);

    const moved = await owner
      .patch(`${items(id)}/${rows[0].id}`)
      .send({ location: 'stash' })
      .expect(200);
    expect(worn(moved.body as Row[])).toEqual({});
    const res = await equip(id, 'meleeMain', rows[0].id).expect(400);
    expect((res.body as { message: string }).message).toBe(
      'Надеть можно только вещь «При себе»',
    );
  });

  it('не та вещь не на то место, не экипировка и чужое место — 400', async () => {
    const sword = await createWeapon(owner, 'Меч');
    const rope = await createItem(owner, { name: 'Верёвка' });
    const { id, rows } = await character(sword, rope);

    await equip(id, 'rangedMain', rows[0].id).expect(400);
    await equip(id, 'head', rows[1].id).expect(400);
    await equip(id, 'tail', rows[0].id).expect(400);
    await owner.put(slotUrl(id, 'meleeMain')).send({}).expect(400);
    // Строка другого персонажа — как несуществующая.
    const other = await character(sword);
    await equip(id, 'meleeMain', other.rows[0].id).expect(404);
  });

  it('автор сделал предмет двуручным — вторая рука пустеет', async () => {
    const sword = await createWeapon(owner, 'Короткий меч');
    const { id, rows } = await character(sword);
    await equip(id, 'meleeOff', rows[0].id).expect(200);

    await owner
      .put(`/api/items/${sword.id}`)
      .send(
        itemBody({
          name: 'Короткий меч',
          category: 'weapon',
          details: weaponDetails({ properties: ['twoHanded'] }),
        }),
      )
      .expect(200);
    const res = await owner.get(`/api/characters/${id}`).expect(200);
    expect(worn((res.body as { inventory: Row[] }).inventory)).toEqual({});
  });

  describe('настройка', () => {
    it('не больше трёх, только у требующих и держится, когда вещь снята', async () => {
      const rings = await Promise.all(
        ['Кольцо 1', 'Кольцо 2', 'Кольцо 3', 'Кольцо 4'].map((name) =>
          createRing(owner, name, true),
        ),
      );
      const plain = await createRing(owner, 'Медное колечко', false);
      const { id, rows } = await character(...rings, plain);

      for (const row of rows.slice(0, 3)) {
        await owner.put(attunementUrl(id, row.id)).expect(200);
      }
      const full = await owner.put(attunementUrl(id, rows[3].id)).expect(400);
      expect((full.body as { message: string }).message).toBe(
        'Персонаж уже настроен на 3 предмета: сначала снимите настройку с другого',
      );
      await owner.put(attunementUrl(id, rows[4].id)).expect(400);

      // Надели и сняли — настройка осталась (по правилам 2024).
      await equip(id, 'ring1', rows[0].id).expect(200);
      const off = await owner.delete(slotUrl(id, 'ring1')).expect(200);
      expect((off.body as Row[]).map((r) => r.attuned)).toEqual([
        true,
        true,
        true,
        false,
        false,
      ]);

      await owner.delete(attunementUrl(id, rows[0].id)).expect(200);
      const res = await owner.put(attunementUrl(id, rows[3].id)).expect(200);
      expect((res.body as Row[]).filter((r) => r.attuned)).toHaveLength(3);
    });

    it('из хранилища не настроиться и не на две копии одного предмета', async () => {
      const ring = await createRing(owner, 'Кольцо защиты', true);
      const { id, rows } = await character(ring);
      await owner.put(attunementUrl(id, rows[0].id)).expect(200);
      // Настроенное кольцо убрали в хранилище: настройка с ним, второе не настроить.
      await owner
        .patch(`${items(id)}/${rows[0].id}`)
        .send({ location: 'stash' })
        .expect(200);
      await owner.put(attunementUrl(id, rows[0].id)).expect(400);
      const added = await owner
        .post(items(id))
        .send({ itemId: ring.id, quantity: 1, location: 'carried' })
        .expect(201);
      const copy = (added.body as Row[]).find((r) => r.location === 'carried');
      const res = await owner.put(attunementUrl(id, copy!.id)).expect(400);
      expect((res.body as { message: string }).message).toBe(
        'Персонаж уже настроен на другую копию этого предмета',
      );
    });
  });

  describe('доступ', () => {
    it('аноним — 401, чужой персонаж — 404', async () => {
      const sword = await createWeapon(owner, 'Меч');
      const { id, rows } = await character(sword);
      const anon = t.anonymous();

      await anon
        .put(slotUrl(id, 'meleeMain'))
        .send({ entryId: rows[0].id })
        .expect(401);
      await anon.delete(slotUrl(id, 'meleeMain')).expect(401);
      await anon.put(attunementUrl(id, rows[0].id)).expect(401);

      await stranger
        .put(slotUrl(id, 'meleeMain'))
        .send({ entryId: rows[0].id })
        .expect(404);
      await stranger.delete(slotUrl(id, 'meleeMain')).expect(404);
      await stranger.put(attunementUrl(id, rows[0].id)).expect(404);
      await stranger.delete(attunementUrl(id, rows[0].id)).expect(404);
    });
  });
});
