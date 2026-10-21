import request from 'supertest';
import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { characterBody } from './support/character-fixture.js';
import { createItem, itemBody } from './support/item-fixture.js';
import { monsterBody } from './support/monster-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

interface EditResult {
  seq: number;
  conflicts: number;
  createdObjectIds: number[];
  refs: { monsters: Record<string, unknown>; items: Record<string, unknown> };
}

interface ChunksResult {
  objects: { id: number; kind: string; at: number[]; hidden: boolean }[];
  nextObjectId: number;
  refs: {
    monsters: Record<string, { missing: string | null; size: string }>;
    items: Record<string, { missing: string | null }>;
    npcs: Record<string, { missing: string | null }>;
  };
}

// Объекты на карте (docs/plan/done/map-objects.md, этап 2): операции журнала, ссылки на
// каталог с заглушками, уникальный монстр, resize и поиск по каталогу для MCP.
describe('объекты на карте (e2e)', () => {
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

  async function createMap(width = 8, depth = 8): Promise<string> {
    const res = await owner
      .post('/api/maps')
      .send({ name: 'Логово', width, depth })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function createMonster(
    agent: request.Agent,
    over: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await agent
      .post('/api/monsters')
      .send({ ...monsterBody(), role: 'regular', ...over })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function createNpc(agent: request.Agent): Promise<string> {
    const res = await agent
      .post('/api/characters')
      .send(characterBody({ kind: 'npc', name: 'Трактирщик' }))
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const ops = (id: string, list: unknown[]) =>
    owner.post(`/api/maps/${id}/ops`).send({ ops: list });

  const chunks = async (id: string) =>
    (await owner.get(`/api/maps/${id}/chunks`).expect(200))
      .body as ChunksResult;

  const place = (at: number[], object: Record<string, unknown>) => ({
    op: 'placeObject',
    at,
    object,
  });

  it('ставит объекты всех видов, правит и убирает; отмена и возврат', async () => {
    const id = await createMap();
    const goblin = await createMonster(owner, { name: 'Гоблин' });
    const npc = await createNpc(owner);
    const rope = await createItem(owner, { name: 'Верёвка' });

    const placed = await ops(id, [
      place([0, 0, 0], { kind: 'start' }),
      place([1, 0, 0], { kind: 'monster', monsterId: goblin, facing: 90 }),
      place([2, 0, 0], { kind: 'npc', characterId: npc }),
      place([3, 0, 0], {
        kind: 'container',
        look: 'barrel',
        items: [{ itemId: rope.id, quantity: 2 }],
      }),
      place([4, 0, 0], { kind: 'item', itemId: rope.id }),
    ]).expect(200);
    const result = placed.body as EditResult;
    expect(result.createdObjectIds).toEqual([1, 2, 3, 4, 5]);
    expect(result.refs.monsters[goblin]).toMatchObject({
      missing: null,
      name: 'Гоблин',
    });
    expect(result.refs.items[rope.id]).toMatchObject({ name: 'Верёвка' });

    // Правка одних объектов — тоже запись журнала.
    const moved = await ops(id, [
      { op: 'moveObject', id: 2, at: [5, 0, 5] },
      { op: 'turnObject', id: 1, facing: 180 },
      { op: 'updateObject', id: 4, object: { name: 'Бочка эля' } },
      { op: 'removeObject', id: 5 },
    ]).expect(200);
    expect((moved.body as EditResult).seq).toBe(2);

    let map = await chunks(id);
    expect(map.nextObjectId).toBe(6);
    expect(map.objects.map((o) => [o.id, o.kind, o.at])).toEqual([
      [1, 'start', [0, 0, 0]],
      [2, 'monster', [5, 0, 5]],
      [3, 'npc', [2, 0, 0]],
      [4, 'container', [3, 0, 0]],
    ]);
    expect(map.objects[3]).toMatchObject({ name: 'Бочка эля', look: 'barrel' });
    expect(map.refs.npcs[npc]).toMatchObject({ missing: null });

    await owner.post(`/api/maps/${id}/undo`).expect(200);
    map = await chunks(id);
    expect(map.objects.find((o) => o.id === 2)?.at).toEqual([1, 0, 0]);
    expect(map.objects.map((o) => o.id)).toContain(5);

    await owner.post(`/api/maps/${id}/redo`).expect(200);
    map = await chunks(id);
    expect(map.objects.map((o) => o.id)).toEqual([1, 2, 3, 4]);

    // Номер убранного объекта не выдаётся снова.
    const next = await ops(id, [place([6, 0, 6], { kind: 'start' })]).expect(
      200,
    );
    expect((next.body as EditResult).createdObjectIds).toEqual([6]);
  });

  it('сводка и срез перечисляют объекты с предупреждениями', async () => {
    const id = await createMap();
    await ops(id, [
      { op: 'fillBox', from: [0, 0, 0], to: [3, 0, 3], block: 'stone' },
      place([1, 1, 1], { kind: 'start' }),
      // На земле без пола — в воздухе.
      place([6, 0, 6], { kind: 'start' }),
    ]).expect(200);
    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    const objects = (
      summary.body as {
        objects: { id: number; label: string; warnings: string[] }[];
      }
    ).objects;
    expect(objects).toMatchObject([
      { id: 1, label: 'Старт 1', warnings: [] },
      {
        id: 2,
        label: 'Старт 2',
        warnings: [expect.stringContaining('нельзя стоять')],
      },
    ]);
    const slice = await owner.get(`/api/maps/${id}/slice?y=1`).expect(200);
    expect((slice.body as { text: string }).text).toContain(
      '#1 Старт 1 [1, 1, 1]',
    );
  });

  it('«скрыт от игроков»: ставится сразу или правкой, виден в сводке, отменяется', async () => {
    const id = await createMap();
    await ops(id, [
      place([1, 0, 1], { kind: 'start' }),
      place([3, 0, 3], { kind: 'container', hidden: true }),
    ]).expect(200);
    await ops(id, [
      { op: 'updateObject', id: 1, object: { hidden: true } },
    ]).expect(200);
    let map = await chunks(id);
    expect(map.objects.map((o) => [o.id, o.hidden])).toEqual([
      [1, true],
      [2, true],
    ]);
    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(
      (summary.body as { objects: { hidden?: boolean }[] }).objects.map(
        (o) => o.hidden,
      ),
    ).toEqual([true, true]);

    await owner.post(`/api/maps/${id}/undo`).expect(200);
    map = await chunks(id);
    expect(map.objects[0].hidden).toBe(false);
    await ops(id, [
      { op: 'updateObject', id: 2, object: { hidden: 'да' } },
    ]).expect(400);
  });

  it('список карт считает старты, без других объектов', async () => {
    const id = await createMap();
    const empty = await createMap();
    await ops(id, [
      place([0, 0, 0], { kind: 'start' }),
      place([1, 0, 0], { kind: 'start' }),
      place([2, 0, 0], { kind: 'container', look: 'sack', items: [] }),
    ]).expect(200);
    const list = await owner.get('/api/maps').expect(200);
    const counts = new Map(
      (list.body as { id: string; startCount: number }[]).map((m) => [
        m.id,
        m.startCount,
      ]),
    );
    expect(counts.get(id)).toBe(2);
    expect(counts.get(empty)).toBe(0);
  });

  it('контейнер поворачивается и не берёт больше своей вместимости', async () => {
    const id = await createMap();
    const anvil = await createItem(owner, { name: 'Наковальня', weight: 25 });
    const placed = await ops(id, [
      place([0, 0, 0], {
        kind: 'container',
        look: 'sack',
        items: [{ itemId: anvil.id, quantity: 1 }],
        facing: 90,
      }),
    ]).expect(200);
    expect((placed.body as EditResult).refs.items[anvil.id]).toMatchObject({
      weight: 25,
    });
    await ops(id, [{ op: 'turnObject', id: 1, facing: 180 }]).expect(200);
    expect((await chunks(id)).objects[0]).toMatchObject({ facing: 180 });

    // Мешок — 30 фнт.: вторая наковальня не влезает, в бочку (120) — влезает.
    const twoAnvils = { items: [{ itemId: anvil.id, quantity: 2 }] };
    const over = await ops(id, [
      { op: 'updateObject', id: 1, object: twoAnvils },
    ]).expect(400);
    expect((over.body as { message: string }).message).toContain(
      'Не влезет в «Мешок»: 50 из 30 фнт.',
    );
    await ops(id, [
      { op: 'updateObject', id: 1, object: { ...twoAnvils, look: 'barrel' } },
    ]).expect(200);

    // Предмет потяжелел в каталоге: сводка предупреждает, разгрузить можно.
    await owner
      .put(`/api/items/${anvil.id}`)
      .send(itemBody({ name: 'Наковальня', weight: 70 }))
      .expect(200);
    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(
      (summary.body as { objects: { warnings: string[] }[] }).objects[0]
        .warnings,
    ).toContain('перегружен: 140 из 120 фнт.');
    await ops(id, [
      {
        op: 'updateObject',
        id: 1,
        object: { items: [{ itemId: anvil.id, quantity: 1 }] },
      },
    ]).expect(200);
  });

  it('ссылки: чужое скрытое, чужой НПС и неизвестное — 400, опубликованное — можно', async () => {
    const id = await createMap();
    const hidden = await createMonster(stranger);
    const published = await createMonster(stranger, { isPublic: true });
    const foreignNpc = await createNpc(stranger);
    const pc = (
      await owner.post('/api/characters').send(characterBody()).expect(201)
    ).body as { id: string };
    const unknown = '00000000-0000-4000-8000-0000000000aa';

    for (const object of [
      { kind: 'monster', monsterId: hidden },
      { kind: 'npc', characterId: foreignNpc },
      // Свой игровой персонаж — не НПС.
      { kind: 'npc', characterId: pc.id },
      { kind: 'item', itemId: unknown },
      { kind: 'container', items: [{ itemId: unknown }] },
    ]) {
      await ops(id, [place([0, 0, 0], object)]).expect(400);
    }
    await ops(id, [
      place([0, 0, 0], { kind: 'monster', monsterId: published }),
    ]).expect(200);
    expect((await chunks(id)).objects).toHaveLength(1);
  });

  it('уникальный монстр — один экземпляр на карте, разные уникальные уживаются', async () => {
    const id = await createMap();
    const dragon = await createMonster(owner, {
      name: 'Дракон',
      role: 'unique',
    });
    const lich = await createMonster(owner, { name: 'Лич', role: 'unique' });
    const goblin = await createMonster(owner, { name: 'Гоблин' });
    await ops(id, [
      place([0, 0, 0], { kind: 'monster', monsterId: dragon }),
      place([4, 0, 4], { kind: 'monster', monsterId: goblin }),
      place([6, 0, 6], { kind: 'monster', monsterId: lich }),
    ]).expect(200);
    const second = await ops(id, [
      place([2, 0, 2], { kind: 'monster', monsterId: dragon }),
    ]).expect(400);
    expect(JSON.stringify(second.body)).toContain(
      'Уникальный монстр «Дракон» уже стоит на карте (объект 1)',
    );
    await ops(id, [
      { op: 'updateObject', id: 2, object: { monsterId: dragon } },
    ]).expect(400);
  });

  it('место существа по размеру внутри карты; объект за границей — 400', async () => {
    const id = await createMap();
    const huge = await createMonster(owner, {
      statBlock: { ...DEFAULT_MONSTER_STAT_BLOCK, size: 'huge' },
    });
    const outside = await ops(id, [
      place([6, 0, 0], { kind: 'monster', monsterId: huge }),
    ]).expect(400);
    expect(JSON.stringify(outside.body)).toContain('за границей карты 8 × 8');
    await ops(id, [place([8, 0, 0], { kind: 'start' })]).expect(400);
    await ops(id, [
      place([5, 0, 5], { kind: 'monster', monsterId: huge }),
    ]).expect(200);
    const map = await chunks(id);
    expect(Object.values(map.refs.monsters)[0]).toMatchObject({ size: 'huge' });
  });

  it('resize сдвигает объекты, срезает и оставляет за границей; отмена возвращает', async () => {
    const id = await createMap();
    const huge = await createMonster(owner, {
      statBlock: { ...DEFAULT_MONSTER_STAT_BLOCK, size: 'huge' },
    });
    await ops(id, [
      place([0, 0, 0], { kind: 'start' }),
      // Огромный занимает x 4..6: после сужения востока на 2 он уже за границей.
      place([4, 0, 0], { kind: 'monster', monsterId: huge }),
    ]).expect(200);
    await ops(id, [{ op: 'resize', grow: { north: 2 } }]).expect(200);
    let map = await chunks(id);
    expect(map.objects.map((o) => o.at)).toEqual([
      [0, 0, 2],
      [4, 0, 2],
    ]);
    await ops(id, [
      { op: 'resize', grow: { west: -1, east: -1 }, cut: 'keep' },
    ]).expect(200);
    map = await chunks(id);
    // Старт срезан с запада, дракон (x 3..5 при ширине 6) ещё внутри.
    expect(map.objects.map((o) => [o.id, o.at])).toEqual([[2, [3, 0, 2]]]);
    await ops(id, [{ op: 'resize', grow: { east: -1 }, cut: 'delete' }]).expect(
      200,
    );
    expect((await chunks(id)).objects).toEqual([]);
    await owner.post(`/api/maps/${id}/undo`).expect(200);
    await owner.post(`/api/maps/${id}/undo`).expect(200);
    map = await chunks(id);
    expect(map.objects.map((o) => [o.id, o.at])).toEqual([
      [1, [0, 0, 2]],
      [2, [4, 0, 2]],
    ]);
  });

  it('удалённый и скрытый после постановки — заглушки, объект остаётся', async () => {
    const id = await createMap();
    const goblin = await createMonster(owner, { isPublic: true });
    const rope = await createItem(owner, { name: 'Верёвка' });
    await ops(id, [
      place([0, 0, 0], { kind: 'monster', monsterId: goblin }),
      place([1, 0, 0], { kind: 'item', itemId: rope.id }),
    ]).expect(200);
    await owner.delete(`/api/monsters/${goblin}`).expect(204);
    await owner.delete(`/api/items/${rope.id}`).expect(204);
    const map = await chunks(id);
    expect(map.objects).toHaveLength(2);
    expect(map.refs.monsters[goblin]).toEqual({
      missing: 'deleted',
      size: 'medium',
    });
    expect(map.refs.items[rope.id]).toEqual({ missing: 'deleted' });
    // Убрать и сдвинуть такой объект можно.
    await ops(id, [
      { op: 'moveObject', id: 1, at: [3, 0, 3] },
      { op: 'removeObject', id: 2 },
    ]).expect(200);
  });

  it('чужая карта — 404, аноним — 401', async () => {
    const id = await createMap();
    const op = { ops: [place([0, 0, 0], { kind: 'start' })] };
    await stranger.post(`/api/maps/${id}/ops`).send(op).expect(404);
    await t.anonymous().post(`/api/maps/${id}/ops`).send(op).expect(401);
    await t.anonymous().get('/api/map-catalog?kind=monster').expect(401);
  });

  it('поиск по каталогу для карты: своё и опубликованное, свои НПС, по API-токену', async () => {
    const mine = await createMonster(owner, { name: 'Кобольд-лучник' });
    await createMonster(stranger, { name: 'Кобольд-тайный' });
    const shared = await createMonster(stranger, {
      name: 'Кобольд-вожак',
      isPublic: true,
    });
    const npc = await createNpc(owner);
    const foreignNpc = await createNpc(stranger);

    const tokenRes = await owner
      .post('/api/api-tokens')
      .send({ name: 'MCP' })
      .expect(201);
    const { token } = tokenRes.body as { token: string };
    const server = t.app.getHttpServer() as Parameters<typeof request>[0];
    const api = (path: string) =>
      request(server).get(path).set('Authorization', `Bearer ${token}`);

    const monsters = await api(
      '/api/map-catalog?kind=monster&q=кобольд',
    ).expect(200);
    const ids = (monsters.body as { id: string }[]).map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining([mine, shared]));
    expect(ids).toHaveLength(2);
    expect(monsters.body).toContainEqual(
      expect.objectContaining({ id: mine, size: 'medium', role: 'regular' }),
    );

    const rope = await createItem(owner, {
      name: 'Кобольдова верёвка',
      weight: 10,
    });
    const found = await api('/api/map-catalog?kind=item&q=кобольдова').expect(
      200,
    );
    expect(found.body).toEqual([
      expect.objectContaining({ id: rope.id, category: 'basic', weight: 10 }),
    ]);

    const npcs = await api('/api/map-catalog?kind=npc').expect(200);
    const npcIds = (npcs.body as { id: string }[]).map((n) => n.id);
    expect(npcIds).toContain(npc);
    expect(npcIds).not.toContain(foreignNpc);

    // Шаблон LIKE не работает: «%» ищется как символ.
    const literal = await api('/api/map-catalog?kind=monster&q=%25').expect(
      200,
    );
    expect(literal.body).toEqual([]);

    await api('/api/map-catalog?kind=spell').expect(400);
  });
});
