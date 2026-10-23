import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameEventPage, GameScenes, GameSceneView } from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Блоки в игре (docs/plan/blocks.md, этап 7): правка или удаление своей группы, которая
// стоит на сценах игр мастера, пишет в журнал этих игр blocks.changed — клиенты
// перечитывают сцену, сервер пересчитывает туман.

const groupBody = {
  description: '',
  isPublic: false,
  look: 'stone',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 1,
  climbable: false,
  hazard: null,
  textures: null,
  shapes: {},
};

const idOf = (res: request.Response) => (res.body as { id: string }).id;

describe('свои блоки в идущих играх (e2e)', () => {
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

  const journal = async (agent: request.Agent, gameId: string) =>
    (
      (await agent.get(`/api/games/${gameId}/events`).expect(200))
        .body as GameEventPage
    ).events;

  it('правка группы на сцене — запись blocks.changed, удаление — пустота у всех', async () => {
    const { master, player, mapId, gameId } = await createSceneGame(
      user,
      png,
      'bgg',
    );
    const m = master.agent;
    const createGroup = async (name: string) =>
      idOf(
        await m
          .post('/api/block-groups')
          .send({ ...groupBody, name })
          .expect(201),
      );
    const used = await createGroup('Стена сцены');
    const unused = await createGroup('Лишняя стена');
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [{ op: 'setBlock', at: [6, 1, 6], block: used }] })
      .expect(200);
    const sceneId = (
      (await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201))
        .body as GameScenes
    ).scenes[0].id;
    await m
      .put(`/api/games/${gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);

    // Группа на сцене: стала прозрачной — в журнал игры уходит запись.
    await m
      .put(`/api/block-groups/${used}`)
      .send({ ...groupBody, name: 'Стеклянная стена', opaque: false })
      .expect(200);
    const [changed] = await journal(m, gameId);
    expect(changed).toMatchObject({
      kind: 'blocks.changed',
      intent: { groupId: used },
      result: {
        group: { id: used, name: 'Стеклянная стена' },
        deleted: false,
        scenes: [{ id: sceneId }],
      },
    });
    const playerView = (
      await player.agent.get(`/api/games/${gameId}/scene`).expect(200)
    ).body as GameSceneView;
    expect(playerView.blocks.find((g) => g.id === used)?.opaque).toBe(false);

    // Группа не на сценах — журнал не трогается.
    await m
      .put(`/api/block-groups/${unused}`)
      .send({ ...groupBody, name: 'Лишняя стена 2' })
      .expect(200);
    expect((await journal(m, gameId))[0].seq).toBe(changed.seq);

    // Удаление: запись с deleted, у игрока группы больше нет — её блоки пустота.
    await m.delete(`/api/block-groups/${used}`).expect(204);
    const [deleted] = await journal(m, gameId);
    expect(deleted).toMatchObject({
      kind: 'blocks.changed',
      result: { group: { id: used }, deleted: true },
    });
    const after = (
      await player.agent.get(`/api/games/${gameId}/scene`).expect(200)
    ).body as GameSceneView;
    expect(after.blocks.map((g) => g.id)).not.toContain(used);
  });
});
