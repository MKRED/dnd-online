import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  Character,
  GameCreature,
  GameCreatures,
  GameEventPage,
  GameLibraryEntry,
  GameScenes,
} from 'shared';
import { characterBody, pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Ячейки и подготовка заклинаний экземпляра НПС (замечания после первой партии, 2026-10-26,
// вариант А): свои у каждого НПС на сцене, как хиты; копия в библиотеке не меняется.
describe('game creature spells (e2e)', () => {
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

  const noCosts = {
    uses: null,
    spellSlot: null,
    movement: null,
    hitDie: false,
  };
  const spell = (name: string, level: number) => ({
    name,
    category: 'spell',
    details: {
      level,
      school: 'evocation',
      components: 'В, С',
      ritual: false,
      duration: { kind: 'instant' },
    },
    description: '',
    isPublic: false,
    activation: { kind: 'action' },
    costs:
      level === 0 ? noCosts : { ...noCosts, spellSlot: { minLevel: level } },
  });

  // Трактирщик из фикстуры получает 2 ячейки 1 круга, «Щит» (1 круг) и заговор; на сцене
  // он дважды: объект 3 и второй экземпляр рядом.
  async function setup(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    await m
      .put(`/api/characters/${g.npc}`)
      .send(
        characterBody({
          kind: 'npc',
          name: 'Трактирщик',
          spellSlots: { '1': { total: 2, expended: 0 } },
        }),
      )
      .expect(200);
    const shield = idOf(
      await m.post('/api/abilities').send(spell('Щит', 1)).expect(201),
    );
    const cantrip = idOf(
      await m
        .post('/api/abilities')
        .send(spell('Огненный снаряд', 0))
        .expect(201),
    );
    for (const abilityId of [shield, cantrip]) {
      await m
        .post(`/api/characters/${g.npc}/abilities`)
        .send({ abilityId })
        .expect(201);
    }
    await m
      .post(`/api/maps/${g.mapId}/ops`)
      .send({
        ops: [
          {
            op: 'placeObject',
            at: [5, 1, 0],
            object: { kind: 'npc', characterId: g.npc },
          },
        ],
      })
      .expect(200);
    const res = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (res.body as GameScenes).scenes[0].id;
    const url = `/api/games/${g.gameId}/scene/creatures`;
    const creatures = async () =>
      ((await m.get(url).expect(200)).body as GameCreatures).creatures;
    const twin = (await creatures()).find(
      (c) => c.objectId !== 3 && c.state?.name === 'Трактирщик',
    )!.objectId;
    return { ...g, m, sceneId, url, creatures, twin, shield, cantrip };
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  const spellsOf = (list: GameCreature[], objectId: number) =>
    list.find((c) => c.objectId === objectId)?.state?.spells;

  it('ячейки — свои у экземпляра; копия в библиотеке не меняется', async () => {
    const g = await setup('gcs_slots');
    const before = await g.creatures();
    expect(spellsOf(before, 2)).toBeNull();
    expect(spellsOf(before, 3)).toEqual({
      slots: { '1': { total: 2, expended: 0 } },
      prepared: {},
    });

    const res = await g.m
      .post(`${g.url}/3/spell-slots`)
      .send({ expended: { 1: 1 } })
      .expect(200);
    const after = (res.body as GameCreatures).creatures;
    expect(spellsOf(after, 3)?.slots).toEqual({
      '1': { total: 2, expended: 1 },
    });
    expect(spellsOf(after, g.twin)?.slots).toEqual({
      '1': { total: 2, expended: 0 },
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.slots_changed',
      as: { kind: 'master' },
      sceneId: g.sceneId,
      intent: { objectId: 3, expended: { 1: 1 } },
      result: {
        creature: { objectId: 3, name: 'Трактирщик' },
        before: { '1': { total: 2, expended: 0 } },
        after: { '1': { total: 2, expended: 1 } },
      },
    });
    // Урон не трогает ячейки, ячейки — хиты.
    await g.m
      .post(`${g.url}/3/changes`)
      .send({ kind: 'damage', amount: 2 })
      .expect(200);
    const hurt = (await g.creatures()).find((c) => c.objectId === 3)!;
    expect(hurt.state).toMatchObject({
      hitPoints: { current: 10 },
      spells: { slots: { '1': { total: 2, expended: 1 } } },
    });

    const copy = (
      await g.m.get(`/api/games/${g.gameId}/library/npc/${g.npc}`).expect(200)
    ).body as GameLibraryEntry;
    expect((copy.record as Character).spellSlots).toEqual({
      '1': { total: 2, expended: 0 },
    });
  });

  it('ячейки: только мастер, не больше, чем есть, и только у НПС', async () => {
    const g = await setup('gcs_slots_rights');
    const slots = (objectId: number, body: unknown, agent = g.m) =>
      agent.post(`${g.url}/${objectId}/spell-slots`).send(body as object);
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await slots(3, { expended: { 1: 1 } }, g.player.agent).expect(403);
    await t
      .anonymous()
      .post(`${g.url}/3/spell-slots`)
      .send({ expended: { 1: 1 } })
      .expect(401);
    const over = await slots(3, { expended: { 1: 3 } }).expect(400);
    expect((over.body as { message: string }).message).toBe(
      'Ячеек 1 круга меньше, чем потрачено',
    );
    await slots(3, { expended: { 1: -1 } }).expect(400);
    await slots(3, {}).expect(400);
    const goblin = await slots(2, { expended: { 1: 0 } }).expect(400);
    expect((goblin.body as { message: string }).message).toBe(
      'Ячейки и подготовка заклинаний есть только у НПС',
    );
    await slots(99, { expended: { 1: 0 } }).expect(404);
  });

  it('«подготовлено» — своё у экземпляра; хранится только отличие от копии', async () => {
    const g = await setup('gcs_prepared');
    const prepare = (objectId: number, abilityId: string, body: unknown) =>
      g.m
        .put(`${g.url}/${objectId}/abilities/${abilityId}`)
        .send(body as object);

    const res = await prepare(3, g.shield, { prepared: true }).expect(200);
    const after = (res.body as GameCreatures).creatures;
    expect(spellsOf(after, 3)?.prepared).toEqual({ [g.shield]: true });
    expect(spellsOf(after, g.twin)?.prepared).toEqual({});
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.prepared',
      intent: { objectId: 3, abilityId: g.shield, prepared: true },
      result: {
        creature: { objectId: 3, name: 'Трактирщик' },
        ability: { id: g.shield, name: 'Щит' },
      },
    });
    // Снова как в копии — отличия нет.
    await prepare(3, g.shield, { prepared: false }).expect(200);
    expect(spellsOf(await g.creatures(), 3)?.prepared).toEqual({});

    // Заговор не готовят; чужого заклинания у НПС нет.
    await prepare(3, g.cantrip, { prepared: true }).expect(404);
    await prepare(3, '00000000-0000-4000-8000-000000000000', {
      prepared: true,
    }).expect(404);
    await prepare(3, g.shield, { prepared: 'да' }).expect(400);
    await prepare(2, g.shield, { prepared: true }).expect(400);
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await g.player.agent
      .put(`${g.url}/3/abilities/${g.shield}`)
      .send({ prepared: true })
      .expect(403);
  });
});
