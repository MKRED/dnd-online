import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  decodeChunk,
  GAME_SOCKET,
  localIndex,
  type GameCreatures,
  type GameSceneEditMessage,
  type GameSceneView,
  type MapObject,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import {
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Туман войны, этап 3 (docs/plan/done/fog-of-war.md, «Что получает игрок»): игроку не уходит
// то, чего группа не видит, — ни в чтении сцены, ни в рассылке правок, ни в существах,
// картинках и пути.
describe('game scene fog: player view (e2e)', () => {
  let t: TestApp;
  let clients: SocketClients;
  let png: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    clients = await listenForSockets(t);
    png = await pngImage();
  });

  afterEach(() => clients.disconnectAll());

  afterAll(async () => {
    await t.close();
  });

  const user = (login: string) => clients.user(login);

  async function view(agent: request.Agent, gameId: string) {
    const res = await agent.get(`/api/games/${gameId}/scene`).expect(200);
    return res.body as GameSceneView;
  }

  // Блок клетки в ответе сцены: 0 — воздух или чанка нет.
  function cellIn(scene: GameSceneView, [x, y, z]: [number, number, number]) {
    const chunk = scene.chunks.find(
      (c) =>
        c.cx === Math.floor(x / 16) &&
        c.cy === Math.floor(y / 16) &&
        c.cz === Math.floor(z / 16),
    );
    if (!chunk) return 0;
    const cells = decodeChunk(Buffer.from(chunk.data, 'base64'));
    return cells[localIndex(x % 16, y % 16, z % 16)];
  }

  const kinds = (objects: MapObject[]) => objects.map((o) => o.kind).sort();

  // Сцена 8×8 (scene-fixture.ts): старт [0, 1, 0], гоблин [1, 1, 0], НПС [2, 1, 0],
  // бочка [3, 1, 0], верёвка [4, 1, 0]. Сцена открыта, туман включён с обзором 5 футов:
  // фигурка на старте видит соседние клетки и гоблина, дальше — ничего.
  async function fogged(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const added = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (added.body as { scenes: { id: string }[] }).scenes[0].id;
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await m
      .put(`/api/games/${g.gameId}/scenes/${sceneId}/fog`)
      .send({ enabled: true, sightRange: 5 })
      .expect(200);
    const all = (await view(m, g.gameId)).objects;
    const idOf = (kind: MapObject['kind']) =>
      all.find((o) => o.kind === kind)!.id;
    const ops = (list: unknown[], status = 200) =>
      m
        .post(`/api/games/${g.gameId}/scenes/${sceneId}/ops`)
        .send({ ops: list })
        .expect(status);
    return { ...g, m, sceneId, idOf, ops };
  }

  it('игроку — только открытые блоки и видимые существа; мастеру — всё', async () => {
    const g = await fogged('gfv_read');
    // Блок высоко над сценой — свой чанк, его игрок не получает вовсе.
    await g.ops([{ op: 'setBlock', at: [7, 20, 7], block: 'stone' }]);
    const master = await view(g.m, g.gameId);
    const player = await view(g.player.agent, g.gameId);
    expect(master.fog).toBeNull();
    expect(cellIn(master, [6, 0, 6])).not.toBe(0);
    expect(master.chunks.some((c) => c.cy === 1)).toBe(true);

    expect(cellIn(player, [1, 0, 1])).not.toBe(0);
    expect(cellIn(player, [6, 0, 6])).toBe(0);
    expect(player.chunks.some((c) => c.cy === 1)).toBe(false);
    expect(player.fog?.explored.length).toBeGreaterThan(0);
    expect(kinds(player.objects)).toEqual(['monster', 'start']);
    // Справочник — только для отправленного: НПС и верёвки в нём нет.
    expect(Object.keys(player.refs.npcs)).toEqual([]);
    expect(Object.keys(player.refs.items)).toEqual([]);
    expect(kinds(master.objects)).toEqual([
      'container',
      'item',
      'monster',
      'npc',
      'start',
    ]);
  });

  it('метки здоровья и картинки — только того, кого видно', async () => {
    const g = await fogged('gfv_creatures');
    for (const id of [g.idOf('monster'), g.idOf('npc')]) {
      await g.m
        .post(`/api/games/${g.gameId}/scene/creatures/${id}/changes`)
        .send({ kind: 'damage', amount: 1000 })
        .expect(200);
    }
    const res = await g.player.agent
      .get(`/api/games/${g.gameId}/scene/creatures`)
      .expect(200);
    const seen = (res.body as GameCreatures).creatures.map((c) => c.objectId);
    expect(seen).toEqual([g.idOf('monster')]);
    const image = `/api/games/${g.gameId}/scene/images/npc/${g.npc}`;
    await g.player.agent.get(image).expect(404);
    await g.m.get(image).expect(200);
    // Туман выключен — НПС виден, и картинка тоже.
    await g.m
      .put(`/api/games/${g.gameId}/scenes/${g.sceneId}/fog`)
      .send({ enabled: false, sightRange: 5 })
      .expect(200);
    await g.player.agent.get(image).expect(200);
  });

  it('рассылка: правка в тумане и ход монстра за его краем игроку не уходят', async () => {
    const g = await fogged('gfv_live');
    const socket = await clients.connect(g.player.cookie);
    await join(socket, g.gameId);
    const edit = () =>
      next<GameSceneEditMessage>(socket, GAME_SOCKET.sceneEdit);

    // Блок в неоткрытом — номер правки без клеток.
    let message = edit();
    await g.ops([{ op: 'setBlock', at: [6, 1, 6], block: 'stone' }]);
    expect((await message).changes.cells).toEqual([]);
    message = edit();
    await g.ops([{ op: 'setBlock', at: [1, 0, 1], block: 'grass' }]);
    expect((await message).changes.cells).toHaveLength(5);

    // Гоблин уходит из поля зрения — у игрока он убран, без нового места.
    const goblin = g.idOf('monster');
    message = edit();
    await g.ops([{ op: 'moveObject', id: goblin, at: [6, 1, 5] }]);
    expect((await message).changes.objects).toEqual([
      {
        id: goblin,
        before: expect.objectContaining({ id: goblin }) as unknown,
        after: null,
      },
    ]);
    // Ходит там, где его не видно, — правка пустая.
    message = edit();
    await g.ops([{ op: 'moveObject', id: goblin, at: [5, 1, 5] }]);
    expect((await message).changes.objects).toBeUndefined();
    expect(kinds((await view(g.player.agent, g.gameId)).objects)).toEqual([
      'start',
    ]);
  });

  it('новый для сцены блок закрывает вид уже в той правке, что его ставит', async () => {
    const g = await fogged('gfv_palette');
    // Фигурка на старте в каменном углу: стены по x = 1 и z = 1.
    await g.ops([
      { op: 'fillBox', from: [1, 1, 0], to: [1, 3, 1], block: 'stone' },
      { op: 'fillBox', from: [0, 1, 1], to: [1, 3, 1], block: 'stone' },
    ]);
    await g.m
      .put(`/api/games/${g.gameId}/scenes/${g.sceneId}/fog`)
      .send({ enabled: true, sightRange: 40 })
      .expect(200);
    // Одной правкой: проём в стене z = 1 и кирпичная стена по z = 3 — кирпича в палитре
    // сцены ещё нет. Пересчитай туман без него, лучи прошли бы сквозь новую стену.
    await g.ops([
      { op: 'fillBox', from: [0, 1, 1], to: [1, 3, 1], block: 'air' },
      { op: 'fillBox', from: [0, 1, 3], to: [7, 3, 3], block: 'brick' },
    ]);
    const player = await view(g.player.agent, g.gameId);
    expect(cellIn(player, [0, 0, 2])).not.toBe(0);
    expect(cellIn(player, [0, 0, 5])).toBe(0);
    expect(cellIn(player, [3, 0, 6])).toBe(0);
  });

  it('скрытого мастер вывел в тумане — игрок его не видит; невидимый не мешает ходу', async () => {
    const g = await fogged('gfv_hidden');
    const goblin = g.idOf('monster');
    await g.ops([
      { op: 'moveObject', id: goblin, at: [0, 1, 3] },
      { op: 'updateObject', id: goblin, object: { hidden: true } },
    ]);
    await g.ops([
      { op: 'updateObject', id: goblin, object: { hidden: false } },
    ]);
    expect(kinds((await view(g.player.agent, g.gameId)).objects)).toEqual([
      'start',
    ]);
    // Гоблина группа не видит: ход игрока его не учитывает и кончается в его клетке —
    // будь гоблин виден, сервер отказал бы, и отказ выдал бы засаду.
    const figures = await g.m
      .get(`/api/games/${g.gameId}/scene/figures`)
      .expect(200);
    const id = (figures.body as { figures: { character: { id: string } }[] })
      .figures[0].character.id;
    await g.player.agent
      .post(`/api/games/${g.gameId}/figures/${id}/move`)
      .send({ to: [0, 1, 3] })
      .expect(200);
    // Дошёл — теперь гоблина видно.
    expect(kinds((await view(g.player.agent, g.gameId)).objects)).toContain(
      'monster',
    );
  });
});
