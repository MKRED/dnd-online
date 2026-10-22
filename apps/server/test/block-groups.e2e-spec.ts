import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  BlockGroupUsage,
  GameScenes,
  GameSceneView,
  MapChunksResponse,
  MapSummaryResponse,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { describeCatalog } from './support/catalog-scenario/index.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Справочник своих блоков (docs/plan/blocks.md, этап 3): группа — запись каталога со
// свойствами для правил; её блоки ставятся на карты и сцены владельца по id группы.

const groupBody = {
  name: 'Тлеющие угли',
  description: 'тест',
  isPublic: false,
  look: 'scorched',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
};

// Плитка 16×16 RGBA в base64 (docs/plan/blocks.md, этап 4б).
const tile = (byte: number, bytes = 1024) =>
  Buffer.alloc(bytes, byte).toString('base64');

const idOf = (res: request.Response) => (res.body as { id: string }).id;

describeCatalog(
  { path: 'block-groups', body: groupBody, invalid: { look: 'mithril' } },
  (get) => {
    describe('свои поля группы', () => {
      it('сохраняются и возвращаются в карточке', async () => {
        const { author, url, create } = get();
        const { id } = await create({
          durability: { armorClass: 17, hitPoints: 27 },
        });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          look: 'scorched',
          color: '#552211',
          movementCost: 2,
          hazard: 'fire',
          durability: { armorClass: 17, hitPoints: 27 },
        });
        expect((card.body as { textures: unknown }).textures).toBeNull();
      });

      it('свои текстуры сохраняются и уходят в каталог карты', async () => {
        const { author, url, create } = get();
        const textures = { top: tile(10), side: tile(20), bottom: tile(30) };
        const { id } = await create({ textures });
        const card = await author.get(url(id)).expect(200);
        expect((card.body as { textures: unknown }).textures).toEqual(textures);
        const mapId = idOf(
          await author
            .post('/api/maps')
            .send({ name: 'С текстурами' })
            .expect(201),
        );
        await author
          .post(`/api/maps/${mapId}/ops`)
          .send({ ops: [{ op: 'setBlock', at: [0, 0, 0], block: id }] })
          .expect(200);
        const chunks = (
          await author.get(`/api/maps/${mapId}/chunks`).expect(200)
        ).body as MapChunksResponse;
        expect(
          chunks.blocks.find((group) => group.id === id)?.textures,
        ).toEqual(textures);
      });

      it('без полей или с неверными — 400', async () => {
        const { author, url, body } = get();
        for (const over of [
          { look: undefined },
          { color: 'red' },
          { opaque: undefined },
          { durability: { armorClass: 0, hitPoints: 27 } },
          { durability: undefined },
          { movementCost: 3 },
          { hazard: 'quicksand' },
          { hazard: undefined },
          { textures: undefined },
          { textures: { top: tile(1), side: tile(1) } },
          { textures: { top: tile(1, 1023), side: tile(1), bottom: tile(1) } },
        ]) {
          await author.post(url()).send(body(over)).expect(400);
        }
      });
    });
  },
);

describe('свои блоки на картах и сценах (e2e)', () => {
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

  const createGroup = async (agent: request.Agent, name = 'Тлеющие угли') =>
    idOf(
      await agent
        .post('/api/block-groups')
        .send({ ...groupBody, name })
        .expect(201),
    );

  it('свой блок ставится, чужой — нет; после удаления группы блок — пустота', async () => {
    const owner = (await user('bg_owner')).agent;
    const stranger = (await user('bg_stranger')).agent;
    const groupId = await createGroup(owner);
    const foreignId = await createGroup(stranger, 'Чужие угли');
    const mapId = idOf(
      await owner.post('/api/maps').send({ name: 'Пепелище' }).expect(201),
    );
    const ops = (list: unknown[]) =>
      owner.post(`/api/maps/${mapId}/ops`).send({ ops: list });

    await ops([
      { op: 'fillBox', from: [0, 0, 0], to: [1, 0, 0], block: groupId },
      { op: 'setBlock', at: [2, 0, 0], block: `${groupId}_slab` },
      { op: 'setBlock', at: [3, 0, 0], block: 'stone' },
    ]).expect(200);
    const foreign = await ops([
      { op: 'setBlock', at: [4, 0, 0], block: foreignId },
    ]).expect(400);
    expect((foreign.body as { message: string }).message).toContain(
      'Неизвестный блок',
    );

    const chunks = (await owner.get(`/api/maps/${mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(chunks.blocks).toEqual([
      expect.objectContaining({
        id: groupId,
        look: 'scorched',
        hazard: 'fire',
      }),
    ]);
    const slice = await owner
      .get(`/api/maps/${mapId}/slice`)
      .query({ y: 0, minX: 0, maxX: 3, minZ: 0, maxZ: 0 })
      .expect(200);
    expect((slice.body as { text: string }).text).toContain(
      `${groupId} «Тлеющие угли»`,
    );

    const usage = (
      await owner.get(`/api/block-groups/${groupId}/usage`).expect(200)
    ).body as BlockGroupUsage;
    expect(usage).toEqual({
      maps: [{ id: mapId, name: 'Пепелище' }],
      scenes: [],
    });
    await stranger.get(`/api/block-groups/${groupId}/usage`).expect(404);
    await t.anonymous().get(`/api/block-groups/${groupId}/usage`).expect(401);

    await owner.delete(`/api/block-groups/${groupId}`).expect(204);
    const summary = (await owner.get(`/api/maps/${mapId}/summary`).expect(200))
      .body as MapSummaryResponse;
    expect(summary.blockCounts).toEqual({ stone: 1 });
    expect(summary.blocks).toEqual([]);
    await ops([{ op: 'setBlock', at: [5, 0, 0], block: groupId }]).expect(400);
  });

  it('сцена: мастер ставит свои блоки, игрок получает только группы сцены', async () => {
    const { master, player, mapId, gameId } = await createSceneGame(
      user,
      png,
      'bg_scene',
    );
    const m = master.agent;
    const used = await createGroup(m, 'Угли сцены');
    const unused = await createGroup(m, 'Лишние угли');
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [{ op: 'setBlock', at: [6, 1, 6], block: used }] })
      .expect(200);
    const scenes = (
      await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201)
    ).body as GameScenes;
    const sceneId = scenes.scenes[0].id;
    await m
      .post(`/api/games/${gameId}/scenes/${sceneId}/ops`)
      .send({
        ops: [{ op: 'setBlock', at: [5, 1, 6], block: `${used}_stairs` }],
      })
      .expect(200);
    await m
      .put(`/api/games/${gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);

    const gmView = (await m.get(`/api/games/${gameId}/scene`).expect(200))
      .body as GameSceneView;
    expect(gmView.blocks.map((g) => g.id).sort()).toEqual(
      [used, unused].sort(),
    );
    const playerView = (
      await player.agent.get(`/api/games/${gameId}/scene`).expect(200)
    ).body as GameSceneView;
    expect(playerView.blocks.map((g) => g.id)).toEqual([used]);

    const usage = (await m.get(`/api/block-groups/${used}/usage`).expect(200))
      .body as BlockGroupUsage;
    expect(usage.scenes).toEqual([
      expect.objectContaining({ id: sceneId, gameId }),
    ]);
  });
});
