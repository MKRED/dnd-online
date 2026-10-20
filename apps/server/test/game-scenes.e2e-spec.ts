import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  Character,
  GameDetail,
  GameEventPage,
  GameLibraryEntry,
  GameLibraryItem,
  GameScenes,
  GameSceneView,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Сцены игры (docs/plan/game.md, этап 5): копия карты мастера, активная сцена,
// перезапуск, «сцена открыта игрокам» и что из сцены уходит игроку.
describe('game scenes (e2e)', () => {
  let t: TestApp;
  let png: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    png = await pngImage();
  });

  afterAll(async () => {
    await t.close();
  });

  async function user(login: string) {
    const agent = await t.loginAs(login);
    const me = await agent.get('/api/auth/me').expect(200);
    return { agent, id: (me.body as { user: { id: string } }).user.id };
  }

  const idOf = (res: request.Response) => (res.body as { id: string }).id;
  const scenesUrl = (gameId: string) => `/api/games/${gameId}/scenes`;
  const sceneUrl = (gameId: string) => `/api/games/${gameId}/scene`;
  const imageUrl = (gameId: string, kind: string, id: string) =>
    `${sceneUrl(gameId)}/images/${kind}/${id}?variant=thumb&v=1`;

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  const setup = (prefix: string) => createSceneGame(user, png, prefix);

  async function addScene(agent: request.Agent, gameId: string, mapId: string) {
    const res = await agent.post(scenesUrl(gameId)).send({ mapId }).expect(201);
    return res.body as GameScenes;
  }

  async function view(agent: request.Agent, gameId: string) {
    const res = await agent.get(sceneUrl(gameId)).expect(200);
    return res.body as GameSceneView;
  }

  it('сцена — копия карты мастера; объекты сцены уходят в библиотеку', async () => {
    const { master, player, mapId, gameId, goblin, npc, rope, gem } =
      await setup('gs_copy');
    const m = master.agent;

    const scenes = await addScene(m, gameId, mapId);
    expect(scenes.open).toBe(false);
    expect(scenes.scenes).toEqual([
      expect.objectContaining({ name: 'Логово', mapId, active: true }),
    ]);
    const sceneId = scenes.scenes[0].id;
    const created = await lastEvent(m, gameId);
    expect(created).toMatchObject({
      kind: 'scene.created',
      sceneId,
      intent: { mapId },
      result: { scene: { id: sceneId, name: 'Логово' }, active: true },
    });
    // Монстр, НПС, верёвка и самоцвет (в бочке и у НПС — один раз).
    expect(created.result).toMatchObject({ libraryCopied: 4 });

    // Карта после копии меняется — сцена нет.
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({
        ops: [{ op: 'placeObject', at: [5, 1, 0], object: { kind: 'start' } }],
      })
      .expect(200);
    const scene = await view(m, gameId);
    expect(scene.scene).toEqual({ id: sceneId, name: 'Логово', open: false });
    expect(scene.objects.map((o) => o.kind)).toEqual([
      'start',
      'monster',
      'npc',
      'container',
      'item',
    ]);
    expect(scene.chunks.length).toBeGreaterThan(0);
    expect(scene.size).toEqual({ width: 8, depth: 8 });
    // Справочник ссылок — из библиотеки.
    expect(scene.refs.monsters[goblin]).toMatchObject({
      missing: null,
      name: 'Гоблин',
    });
    expect(scene.refs.npcs[npc]).toMatchObject({
      missing: null,
      name: 'Трактирщик',
      mainImage: { thumbVersion: 1 },
    });
    expect(scene.refs.items[rope.id]).toMatchObject({ name: 'Верёвка' });

    // НПС — копия листа со своим предметом.
    const list = (await m.get(`/api/games/${gameId}/library`).expect(200))
      .body as GameLibraryItem[];
    expect(list.find((e) => e.kind === 'npc')).toMatchObject({
      sourceId: npc,
      category: 'npc',
      image: { version: 1 },
    });
    const npcCopy = (
      await m.get(`/api/games/${gameId}/library/npc/${npc}`).expect(200)
    ).body as GameLibraryEntry;
    const sheet = npcCopy.record as Character;
    expect(sheet).toMatchObject({ name: 'Трактирщик', kind: 'npc' });
    expect(sheet.inventory).toEqual([
      expect.objectContaining({
        id: gem.id,
        quantity: 1,
        location: 'carried',
        item: expect.objectContaining({ name: 'Самоцвет' }) as unknown,
      }),
    ]);
    await m
      .get(`/api/games/${gameId}/library/npc/${npc}/image?variant=full&v=1`)
      .expect(200);

    // Закрытая сцена: в лобби игрока её нет, читать её нельзя.
    const lobby = (await player.agent.get(`/api/games/${gameId}`).expect(200))
      .body as GameDetail;
    expect(lobby.scene).toBeNull();
    const masterLobby = (await m.get(`/api/games/${gameId}`).expect(200))
      .body as GameDetail;
    expect(masterLobby.scene).toEqual({
      id: sceneId,
      name: 'Логово',
      open: false,
    });
    await player.agent.get(sceneUrl(gameId)).expect(403);

    // Вторая сцена активной не становится.
    const second = await addScene(m, gameId, mapId);
    expect(second.scenes.map((s) => s.active)).toEqual([true, false]);
  });

  it('добавить сцену может только мастер и только из своей карты', async () => {
    const { master, player, mapId, gameId } = await setup('gs_access');
    const stranger = await user('gs_access_stranger');
    const foreignMap = idOf(
      await stranger.agent
        .post('/api/maps')
        .send({ name: 'Чужая', width: 4, depth: 4 })
        .expect(201),
    );

    await player.agent.post(scenesUrl(gameId)).send({ mapId }).expect(403);
    await player.agent.get(scenesUrl(gameId)).expect(403);
    await t.anonymous().get(scenesUrl(gameId)).expect(401);
    await master.agent
      .post(scenesUrl(gameId))
      .send({ mapId: foreignMap })
      .expect(404);
    await master.agent
      .post(scenesUrl(gameId))
      .send({ mapId: 'не-карта' })
      .expect(400);
    // Без активной сцены открыть нечего.
    await master.agent
      .put(`${scenesUrl(gameId)}/open`)
      .send({ open: true })
      .expect(409);
    await master.agent.get(sceneUrl(gameId)).expect(404);
  });

  it('открытая сцена: игроку без скрытого и без содержимого контейнеров, картинки — только объектов сцены', async () => {
    const { master, player, mapId, gameId, goblin, npc, rope, gem } =
      await setup('gs_open');
    const m = master.agent;
    const stranger = await user('gs_open_stranger');
    // Монстр — засада: скрыт от игроков ещё в карте, признак копируется в сцену.
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [{ op: 'updateObject', id: 2, object: { hidden: true } }] })
      .expect(200);
    const scenes = await addScene(m, gameId, mapId);
    const sceneId = scenes.scenes[0].id;

    const opened = await m
      .put(`${scenesUrl(gameId)}/open`)
      .send({ open: true })
      .expect(200);
    expect((opened.body as GameScenes).open).toBe(true);
    expect(await lastEvent(m, gameId)).toMatchObject({
      kind: 'scene.opened',
      sceneId,
      result: { scene: { id: sceneId, name: 'Логово' } },
    });
    // Повторное открытие ничего не пишет.
    await m
      .put(`${scenesUrl(gameId)}/open`)
      .send({ open: true })
      .expect(200);
    expect((await lastEvent(m, gameId)).kind).toBe('scene.opened');

    const lobby = (await player.agent.get(`/api/games/${gameId}`).expect(200))
      .body as GameDetail;
    expect(lobby.scene).toEqual({ id: sceneId, name: 'Логово', open: true });
    // С этого номера лобби входит в комнату сокета.
    expect(lobby.eventSeq).toBe((await lastEvent(m, gameId)).seq);
    const seen = await view(player.agent, gameId);
    expect(seen.objects.map((o) => o.kind)).toEqual([
      'start',
      'npc',
      'container',
      'item',
    ]);
    expect(seen.objects.find((o) => o.kind === 'container')).toMatchObject({
      items: [],
    });
    expect(seen.contentsHidden).toBe(true);
    expect(seen.refs.monsters[goblin]).toBeUndefined();
    expect(seen.refs.items[gem.id]).toBeUndefined();
    // Мастер видит всё.
    const full = await view(m, gameId);
    expect(full.objects).toHaveLength(5);
    expect(full.contentsHidden).toBe(false);
    expect(full.objects.find((o) => o.kind === 'container')).toMatchObject({
      items: [{ itemId: gem.id, quantity: 2 }],
    });

    // Картинки: игроку — НПС и предмет на полу; самоцвет только в бочке — нет.
    const npcImage = await player.agent
      .get(imageUrl(gameId, 'npc', npc))
      .expect(200);
    expect(npcImage.headers['content-type']).toBe('image/webp');
    expect(npcImage.headers['cache-control']).toContain('immutable');
    await player.agent.get(imageUrl(gameId, 'item', rope.id)).expect(200);
    await player.agent.get(imageUrl(gameId, 'item', gem.id)).expect(404);
    await player.agent.get(imageUrl(gameId, 'monster', goblin)).expect(404);
    await m.get(imageUrl(gameId, 'item', gem.id)).expect(200);
    await player.agent.get(imageUrl(gameId, 'effect', gem.id)).expect(400);
    // Не участник открытой игры сцену не видит.
    await stranger.agent.get(sceneUrl(gameId)).expect(403);
    await stranger.agent.get(imageUrl(gameId, 'npc', npc)).expect(403);
    await t.anonymous().get(sceneUrl(gameId)).expect(401);

    // Закрыли — игроку ни сцены, ни картинок.
    await m
      .put(`${scenesUrl(gameId)}/open`)
      .send({ open: false })
      .expect(200);
    expect(await lastEvent(m, gameId)).toMatchObject({
      kind: 'scene.closed',
      sceneId,
    });
    await player.agent.get(sceneUrl(gameId)).expect(403);
    // Отказ не кешируется: сцену откроют снова — картинка должна загрузиться.
    const refused = await player.agent
      .get(imageUrl(gameId, 'npc', npc))
      .expect(404);
    expect(refused.headers['cache-control'] ?? '').not.toContain('immutable');
    await player.agent
      .put(`${scenesUrl(gameId)}/open`)
      .send({ open: true })
      .expect(403);
  });

  it('смена активной сцены и перезапуск новой копией карты', async () => {
    const { master, player, mapId, gameId } = await setup('gs_restart');
    const m = master.agent;
    await addScene(m, gameId, mapId);
    const second = await addScene(m, gameId, mapId);
    const [first, next] = second.scenes;

    const activated = await m
      .put(`${scenesUrl(gameId)}/active`)
      .send({ sceneId: next.id })
      .expect(200);
    expect(
      (activated.body as GameScenes).scenes.map((s) => [s.id, s.active]),
    ).toEqual([
      [first.id, false],
      [next.id, true],
    ]);
    expect(await lastEvent(m, gameId)).toMatchObject({
      kind: 'scene.activated',
      sceneId: next.id,
    });
    // Уже активная — без новой записи.
    const before = (await lastEvent(m, gameId)).seq;
    await m
      .put(`${scenesUrl(gameId)}/active`)
      .send({ sceneId: next.id })
      .expect(200);
    expect((await lastEvent(m, gameId)).seq).toBe(before);
    await player.agent
      .put(`${scenesUrl(gameId)}/active`)
      .send({ sceneId: first.id })
      .expect(403);

    // Перезапуск берёт карту такой, какая она сейчас.
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({
        ops: [{ op: 'placeObject', at: [6, 1, 6], object: { kind: 'start' } }],
      })
      .expect(200);
    const restarted = await m
      .post(`${scenesUrl(gameId)}/${next.id}/restart`)
      .expect(201);
    const after = (restarted.body as GameScenes).scenes;
    expect(after).toHaveLength(2);
    expect(after[0].id).toBe(first.id);
    expect(after[1]).toMatchObject({ name: 'Логово', active: true });
    expect(after[1].id).not.toBe(next.id);
    expect(await lastEvent(m, gameId)).toMatchObject({
      kind: 'scene.restarted',
      sceneId: after[1].id,
      intent: { sceneId: next.id },
      result: { from: { id: next.id }, scene: { id: after[1].id } },
    });
    expect((await view(m, gameId)).objects).toHaveLength(6);
    // Старая копия ушла из списка: её не сделать активной и не перезапустить.
    await m
      .put(`${scenesUrl(gameId)}/active`)
      .send({ sceneId: next.id })
      .expect(404);
    await m.post(`${scenesUrl(gameId)}/${next.id}/restart`).expect(404);

    // Карту удалили — сцена осталась, но перезапустить её нельзя.
    await m.delete(`/api/maps/${mapId}`).expect(204);
    const left = (await m.get(scenesUrl(gameId)).expect(200))
      .body as GameScenes;
    expect(left.scenes.map((s) => s.mapId)).toEqual([null, null]);
    await m.post(`${scenesUrl(gameId)}/${first.id}/restart`).expect(409);
    expect((await view(m, gameId)).objects).toHaveLength(6);
  });
});
