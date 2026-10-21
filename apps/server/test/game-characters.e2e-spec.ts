import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Character, CharacterEffectEntry, GameEventPage } from 'shared';
import { characterBody } from './support/character-fixture.js';
import {
  listenForSockets,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Персонаж игрока в игре (docs/plan/done/game.md, этап 8): лист, хиты, спасброски, ячейки и
// эффекты правят мастер, владелец и управляющий; правка пишется в лист и в журнал.
describe('game characters (e2e)', () => {
  let t: TestApp;
  let clients: SocketClients;

  beforeAll(async () => {
    t = await createTestApp();
    clients = await listenForSockets(t);
  });

  afterEach(() => clients.disconnectAll());

  afterAll(async () => {
    await t.close();
  });

  const user = (login: string) => clients.user(login);
  const idOf = (res: request.Response) => (res.body as { id: string }).id;

  // Мастер, игрок на месте с персонажем (12 хитов, ячейки 1 круга — 2), второй игрок на
  // месте и посторонний.
  async function setup(prefix: string) {
    const master = await user(`${prefix}_master`);
    const gameId = idOf(
      await master.agent
        .post('/api/games')
        .send({ name: 'Игра', seatCount: 3 })
        .expect(201),
    );
    const seat = async (login: string, name: string) => {
      const u = await user(login);
      const character = idOf(
        await u.agent
          .post('/api/characters')
          .send(
            characterBody({
              name,
              spellSlots: { 1: { total: 2, expended: 0 } },
            }),
          )
          .expect(201),
      );
      await u.agent
        .post(`/api/games/${gameId}/seats`)
        .send({ characterId: character })
        .expect(201);
      return { ...u, character };
    };
    const player = await seat(`${prefix}_player`, 'Элиан');
    const second = await seat(`${prefix}_second`, 'Борн');
    const stranger = await user(`${prefix}_stranger`);
    const url = `/api/games/${gameId}/characters/${player.character}`;
    return { master, gameId, player, second, stranger, url };
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  const change = (
    agent: request.Agent,
    url: string,
    body: Record<string, unknown>,
    status = 200,
  ) => agent.post(`${url}/changes`).send(body).expect(status);

  const sheetOf = (res: request.Response) => res.body as Character;

  it('лист из игры видят мастер, владелец и управляющий', async () => {
    const g = await setup('gch_read');
    for (const agent of [g.master.agent, g.player.agent]) {
      const res = await agent.get(g.url).expect(200);
      expect(sheetOf(res)).toMatchObject({
        id: g.player.character,
        name: 'Элиан',
        hitPointsCurrent: 12,
        effects: [],
      });
    }
    await g.second.agent.get(g.url).expect(403);
    await g.stranger.agent.get(g.url).expect(403);
    await t.anonymous().get(g.url).expect(401);
    // Персонажа нет на местах этой игры.
    const other = idOf(
      await g.stranger.agent
        .post('/api/characters')
        .send(characterBody())
        .expect(201),
    );
    await g.master.agent
      .get(`/api/games/${g.gameId}/characters/${other}`)
      .expect(404);

    await g.master.agent
      .put(`/api/games/${g.gameId}/seats/${g.player.id}/controller`)
      .send({ controllerId: g.second.id })
      .expect(200);
    await g.second.agent.get(g.url).expect(200);
  });

  it('урон, лечение, временные хиты и спасброски — в лист и в журнал, и во время встречи', async () => {
    const g = await setup('gch_hp');
    await g.master.agent.post(`/api/games/${g.gameId}/session`).expect(201);
    // Лист закрыт встречей для обычной правки, а из игры — правится.
    await g.player.agent
      .patch(`/api/characters/${g.player.character}`)
      .send({ hitPointsCurrent: 5 })
      .expect(409);

    await change(g.player.agent, g.url, { kind: 'temp', amount: 5 });
    const hit = await change(g.master.agent, g.url, {
      kind: 'damage',
      amount: 7,
    });
    expect(sheetOf(hit)).toMatchObject({
      hitPointsCurrent: 10,
      hitPointsTemp: 0,
    });
    expect(await lastEvent(g.master.agent, g.gameId)).toMatchObject({
      kind: 'character.changed',
      actor: { id: g.master.id },
      as: { kind: 'master' },
      intent: {
        characterId: g.player.character,
        change: { kind: 'damage', amount: 7 },
      },
      result: {
        character: { id: g.player.character, name: 'Элиан' },
        before: { hitPointsCurrent: 12, hitPointsTemp: 5 },
        after: { hitPointsCurrent: 10, hitPointsTemp: 0 },
        instantDeath: false,
      },
    });

    // До нуля — затем урон на нуле даёт провал, лечение обнуляет счёт.
    await change(g.player.agent, g.url, { kind: 'damage', amount: 10 });
    const failed = await change(g.player.agent, g.url, {
      kind: 'damage',
      amount: 1,
    });
    expect(sheetOf(failed)).toMatchObject({
      hitPointsCurrent: 0,
      deathSaveFailures: 1,
    });
    expect(await lastEvent(g.master.agent, g.gameId)).toMatchObject({
      as: { kind: 'character', id: g.player.character },
    });
    await change(g.player.agent, g.url, {
      kind: 'death_saves',
      successes: 2,
      failures: 1,
    });
    const healed = await change(g.player.agent, g.url, {
      kind: 'heal',
      amount: 30,
    });
    expect(sheetOf(healed)).toMatchObject({
      hitPointsCurrent: 12,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    });
    // Лист владельца — тот же.
    const own = await g.player.agent
      .get(`/api/characters/${g.player.character}`)
      .expect(200);
    expect(sheetOf(own).hitPointsCurrent).toBe(12);

    // Мгновенная смерть: 12 хитов, максимум 12, урон 24 — и мёртвого не вылечить.
    await change(g.master.agent, g.url, { kind: 'damage', amount: 24 });
    expect(await lastEvent(g.master.agent, g.gameId)).toMatchObject({
      result: { instantDeath: true, after: { deathSaveFailures: 3 } },
    });
    await change(g.master.agent, g.url, { kind: 'heal', amount: 5 }, 409);
  });

  it('ячейки тратятся из игры; неверные правки — 400', async () => {
    const g = await setup('gch_slots');
    const spent = await change(g.player.agent, g.url, {
      kind: 'spell_slots',
      expended: { 1: 1 },
    });
    expect(sheetOf(spent).spellSlots).toEqual({ 1: { total: 2, expended: 1 } });
    await change(
      g.player.agent,
      g.url,
      { kind: 'spell_slots', expended: { 1: 3 } },
      400,
    );
    await change(g.player.agent, g.url, { kind: 'damage', amount: -1 }, 400);
    await change(g.player.agent, g.url, { kind: 'damage' }, 400);
    await change(g.player.agent, g.url, { kind: 'explode', amount: 1 }, 400);
    await change(
      g.player.agent,
      g.url,
      { kind: 'death_saves', successes: 4, failures: 0 },
      400,
    );
  });

  it('правит только тот, кто ведёт персонажа: снятый управляющий — уже нет', async () => {
    const g = await setup('gch_rights');
    const hit = { kind: 'damage', amount: 1 };
    await change(g.second.agent, g.url, hit, 403);
    await change(g.stranger.agent, g.url, hit, 403);
    await t.anonymous().post(`${g.url}/changes`).send(hit).expect(401);
    const controllerUrl = `/api/games/${g.gameId}/seats/${g.player.id}/controller`;
    await g.master.agent
      .put(controllerUrl)
      .send({ controllerId: g.second.id })
      .expect(200);
    await change(g.second.agent, g.url, hit);
    await g.master.agent
      .put(controllerUrl)
      .send({ controllerId: null })
      .expect(200);
    await change(g.second.agent, g.url, hit, 403);
    await g.second.agent
      .post(`${g.url}/effects`)
      .send({ effectId: g.player.character })
      .expect(403);
  });

  it('эффект мастера, скрытый от игрока, в игре действует; копия — в библиотеке', async () => {
    const g = await setup('gch_effects');
    const body = (over: Record<string, unknown>) => ({
      name: 'Ускорение',
      components: [
        { kind: 'speed', change: 'double', feet: null, hover: false },
      ],
      description: '',
      isPublic: false,
      duration: { kind: 'permanent' },
      saveEnds: null,
      ...over,
    });
    const effect = (agent: request.Agent, over: Record<string, unknown>) =>
      agent.post('/api/effects').send(body(over)).expect(201).then(idOf);
    const secret = await effect(g.master.agent, { name: 'Тайный дар' });
    const chill = await effect(g.master.agent, {
      name: 'Леденящее прикосновение',
      components: [{ kind: 'no_healing' }],
    });

    const added = await g.master.agent
      .post(`${g.url}/effects`)
      .send({ effectId: secret })
      .expect(201);
    const entries = added.body as CharacterEffectEntry[];
    expect(entries).toEqual([
      expect.objectContaining({
        effect: expect.objectContaining({
          id: secret,
          name: 'Тайный дар',
        }) as unknown,
        missing: null,
        inactive: false,
      }),
    ]);
    expect(await lastEvent(g.master.agent, g.gameId)).toMatchObject({
      kind: 'character.effect_added',
      result: { effect: { id: secret, name: 'Тайный дар' }, libraryCopied: 1 },
    });
    // Из игры игрок видит действующий эффект, в своём листе — скрытый от него.
    const inGame = await g.player.agent.get(g.url).expect(200);
    expect(sheetOf(inGame).effects[0]).toMatchObject({ inactive: false });
    const own = await g.player.agent
      .get(`/api/characters/${g.player.character}`)
      .expect(200);
    expect(sheetOf(own).effects[0]).toMatchObject({
      effect: null,
      missing: 'hidden',
    });
    // Автор правит эффект — в игре осталась копия.
    await g.master.agent
      .put(`/api/effects/${secret}`)
      .send(body({ name: 'Переименован' }))
      .expect(200);
    const after = await g.master.agent.get(g.url).expect(200);
    expect(sheetOf(after).effects[0].effect?.name).toBe('Тайный дар');

    // Игрок не накладывает то, чего не видит; повтор — 409.
    await g.player.agent
      .post(`${g.url}/effects`)
      .send({ effectId: chill })
      .expect(400);
    await g.master.agent
      .post(`${g.url}/effects`)
      .send({ effectId: secret })
      .expect(409);

    // Запрет лечения — лечение отклонено с именем эффекта.
    await g.master.agent
      .post(`${g.url}/effects`)
      .send({ effectId: chill })
      .expect(201);
    await change(g.master.agent, g.url, { kind: 'damage', amount: 3 });
    const refused = await change(
      g.player.agent,
      g.url,
      { kind: 'heal', amount: 3 },
      400,
    );
    expect((refused.body as { message: string }).message).toBe(
      'Лечение запрещено: Леденящее прикосновение',
    );

    const removed = await g.player.agent
      .delete(`${g.url}/effects/${entries[0].id}`)
      .expect(200);
    expect(removed.body as CharacterEffectEntry[]).toHaveLength(1);
    expect(await lastEvent(g.master.agent, g.gameId)).toMatchObject({
      kind: 'character.effect_removed',
      result: { effect: { id: secret, name: 'Тайный дар' } },
    });
    await g.player.agent
      .delete(`${g.url}/effects/${entries[0].id}`)
      .expect(404);
  });
});
