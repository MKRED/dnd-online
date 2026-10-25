import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  AIR,
  applyChangeset,
  CHUNK_VOLUME,
  chunkKey,
  decodeChunk,
  GAME_SOCKET,
  MemoryChunkStore,
  unpackChangeset,
  type GameFigures,
  type GameSceneEditMessage,
  type GameSceneFogMessage,
  type GameSceneFogView,
  type GameSceneView,
  type MapObject,
  type MapObjects,
  type MapState,
  type PackedChangeset,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame, startSession } from './support/scene-fixture.js';
import {
  collect,
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Туман войны, этап 4 (docs/plan/done/fog-of-war.md): разница тумана посчитана в транзакции
// записи и уходит игрокам — в правке сцены или отдельным сообщением при ходе фигурки.
// Главная проверка: копия игрока, к которой приложены все сообщения, совпадает со
// свежим чтением сцены — без конфликтов и без лишнего.
describe('game scene fog: live updates (e2e)', () => {
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

  // Копия сцены у игрока: блоки, объекты, маски — как их держит страница сцены.
  interface Copy extends MapState {
    objects: MapObjects;
    seq: number;
    fog: Map<string, { explored?: string; visible?: string }>;
  }

  function copyOf(scene: GameSceneView): Copy {
    const store = new MemoryChunkStore();
    for (const { cx, cy, cz, data } of scene.chunks) {
      store.set(chunkKey(cx, cy, cz), decodeChunk(Buffer.from(data, 'base64')));
    }
    const copy: Copy = {
      store,
      palette: [...scene.palette],
      objects: {
        byId: new Map(scene.objects.map((o) => [o.id, o])),
        nextId: scene.nextObjectId,
      },
      seq: scene.seq,
      fog: new Map(),
    };
    mergeFog(copy, scene.fog!);
    return copy;
  }

  function mergeFog(copy: Copy, fog: GameSceneFogView) {
    for (const kind of ['explored', 'visible'] as const) {
      for (const { cx, cy, cz, bits } of fog[kind]) {
        const key = chunkKey(cx, cy, cz);
        copy.fog.set(key, { ...copy.fog.get(key), [kind]: bits });
      }
    }
  }

  function apply(copy: Copy, changes: PackedChangeset) {
    const { conflicts, objectConflicts } = applyChangeset(
      copy,
      unpackChangeset(changes),
      'forward',
    );
    expect({ conflicts, objectConflicts }).toEqual({
      conflicts: [],
      objectConflicts: [],
    });
  }

  const ZERO = Buffer.alloc(512).toString('base64');
  const sortById = (objects: Iterable<MapObject>) =>
    [...objects].sort((a, b) => a.id - b.id);

  // Копия игрока совпадает со свежим чтением: блоки, объекты, маски.
  function expectSame(copy: Copy, fresh: GameSceneView) {
    const other = copyOf(fresh);
    const keys = new Set([...copy.store.keys(), ...other.store.keys()]);
    for (const key of keys) {
      const a = copy.store.get(key) ?? new Uint16Array(CHUNK_VOLUME);
      const b = other.store.get(key) ?? new Uint16Array(CHUNK_VOLUME);
      const differs = a.findIndex((value, i) => value !== b[i]);
      expect({ key, differs, value: a[differs] ?? AIR }).toEqual({
        key,
        differs: -1,
        value: AIR,
      });
    }
    expect(sortById(copy.objects.byId.values())).toEqual(
      sortById(other.objects.byId.values()),
    );
    const masks = (fog: Copy['fog']) =>
      Object.fromEntries(
        [...fog].map(([key, m]) => [
          key,
          { explored: m.explored ?? ZERO, visible: m.visible ?? ZERO },
        ]),
      );
    expect(masks(copy.fog)).toEqual(masks(other.fog));
    expect(copy.seq).toBe(fresh.seq);
  }

  it('ход фигурки и правки мастера: копия игрока совпадает со свежей сценой', async () => {
    const g = await createSceneGame(user, png, 'gfl_flow');
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
    await startSession(m, g.gameId);
    await m
      .put(`/api/games/${g.gameId}/scenes/${sceneId}/fog`)
      .send({ enabled: true, sightRange: 10 })
      .expect(200);
    const figures = await m
      .get(`/api/games/${g.gameId}/scene/figures`)
      .expect(200);
    const hero = (figures.body as GameFigures).figures[0].character.id;
    const goblin = (await view(m, g.gameId)).objects.find(
      (o) => o.kind === 'monster',
    )!.id;

    const playerSocket = await clients.connect(g.player.cookie);
    await join(playerSocket, g.gameId);
    const masterSocket = await clients.connect(g.master.cookie);
    await join(masterSocket, g.gameId);
    const masterFog = collect<GameSceneFogMessage>(
      masterSocket,
      GAME_SOCKET.sceneFog,
      4000,
    );
    const copy = copyOf(await view(g.player.agent, g.gameId));

    const moveTo = async (to: [number, number, number]) => {
      const message = next<GameSceneFogMessage>(
        playerSocket,
        GAME_SOCKET.sceneFog,
      );
      await g.player.agent
        .post(`/api/games/${g.gameId}/figures/${hero}/move`)
        .send({ to })
        .expect(200);
      const fog = await message;
      // Номер правки ход не двигает: туман ложится на ту же копию.
      expect(fog.seq).toBe(copy.seq);
      apply(copy, fog.changes);
      mergeFog(copy, fog.fog);
    };
    const ops = async (list: unknown[]) => {
      const message = next<GameSceneEditMessage>(
        playerSocket,
        GAME_SOCKET.sceneEdit,
      );
      await m
        .post(`/api/games/${g.gameId}/scenes/${sceneId}/ops`)
        .send({ ops: list })
        .expect(200);
      const edit = await message;
      expect(edit.seq).toBe(copy.seq + 1);
      apply(copy, edit.changes);
      mergeFog(copy, edit.fog!);
      copy.seq = edit.seq;
      return edit;
    };
    const check = async () =>
      expectSame(copy, await view(g.player.agent, g.gameId));

    // Ход на юг: открылся новый пол, гоблин на старте ушёл из поля зрения.
    await moveTo([0, 1, 4]);
    await check();
    expect(copy.objects.byId.has(goblin)).toBe(false);

    // Стена поперёк сцены перед фигуркой.
    await ops([
      { op: 'fillBox', from: [0, 1, 5], to: [7, 3, 5], block: 'stone' },
    ]);
    await check();

    // Гоблин, которого не видно, подошёл вплотную — для игрока он появился.
    const came = await ops([{ op: 'moveObject', id: goblin, at: [1, 1, 3] }]);
    expect(came.changes.objects).toEqual([
      {
        id: goblin,
        before: null,
        after: expect.objectContaining({ id: goblin }) as unknown,
      },
    ]);
    await check();

    // Стену снесли — за ней снова видно: пол там открыт ещё до стены.
    const opened = await ops([
      { op: 'fillBox', from: [0, 1, 5], to: [7, 3, 5], block: 'air' },
    ]);
    expect(opened.fog!.visible.length).toBeGreaterThan(0);
    await check();
    await moveTo([0, 1, 6]);
    await check();

    // Мастер видит всё — туман ему не шлют.
    expect(await masterFog).toEqual([]);
  });
});
