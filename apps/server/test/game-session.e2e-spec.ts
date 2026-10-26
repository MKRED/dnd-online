import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Character, GameDetail, GameEventPage } from 'shared';
import { characterBody } from './support/character-fixture.js';
import { createItem } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

const effectBody = (name: string, change: string) => ({
  name,
  components: [{ kind: 'speed', change, feet: null, hover: false }],
  description: '',
  isPublic: false,
  duration: { kind: 'time', amount: 1, unit: 'minute', concentration: false },
  saveEnds: null,
});

// Встреча (docs/plan/done/game.md, этап 3): мастер начинает и заканчивает её, пока она идёт,
// лист персонажа на месте закрыт для правки владельцем.
describe('game session (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  async function user(login: string) {
    const agent = await t.loginAs(login);
    const me = await agent.get('/api/auth/me').expect(200);
    return { agent, id: (me.body as { user: { id: string } }).user.id };
  }

  async function character(agent: request.Agent) {
    const res = await agent
      .post('/api/characters')
      .send(
        characterBody({
          name: 'Сидящий',
          spellSlots: { '1': { total: 2, expended: 0 } },
        }),
      )
      .expect(201);
    return (res.body as { id: string }).id;
  }

  // Мастер, игра и игрок на месте своим персонажем.
  async function seated(prefix: string) {
    const master = await user(`${prefix}_master`);
    const res = await master.agent
      .post('/api/games')
      .send({ name: 'Встречная', seatCount: 2 })
      .expect(201);
    const gameId = (res.body as GameDetail).id;
    const player = await user(`${prefix}_player`);
    const characterId = await character(player.agent);
    await player.agent
      .post(`/api/games/${gameId}/seats`)
      .send({ characterId })
      .expect(201);
    return { master, player, gameId, characterId };
  }

  const session = (gameId: string) => `/api/games/${gameId}/session`;

  it('мастер начинает и заканчивает встречу, это записи журнала', async () => {
    const { master, player, gameId } = await seated('gs_basic');

    const started = await master.agent.post(session(gameId)).expect(201);
    expect((started.body as GameDetail).sessionStartedAt).toEqual(
      expect.any(String),
    );
    // Встреча видна и в списке.
    const list = await player.agent.get('/api/games').expect(200);
    expect(
      (list.body as GameDetail[]).find((g) => g.id === gameId)
        ?.sessionStartedAt,
    ).toEqual(expect.any(String));
    await master.agent.post(session(gameId)).expect(409);

    const ended = await master.agent.delete(session(gameId)).expect(200);
    expect((ended.body as GameDetail).sessionStartedAt).toBeNull();
    await master.agent.delete(session(gameId)).expect(409);

    const journal = await master.agent
      .get(`/api/games/${gameId}/events?limit=2`)
      .expect(200);
    const [end, start] = (journal.body as GameEventPage).events;
    expect(start).toMatchObject({
      kind: 'session.started',
      as: { kind: 'master' },
    });
    expect(end).toMatchObject({
      kind: 'session.ended',
      result: { startedAt: (started.body as GameDetail).sessionStartedAt },
    });
  });

  it('начать и закончить встречу может только мастер', async () => {
    const { master, player, gameId } = await seated('gs_acl');
    const stranger = await user('gs_acl_stranger');
    for (const agent of [player.agent, stranger.agent]) {
      const res = await agent.post(session(gameId)).expect(403);
      expect((res.body as { message: string }).message).toBe(
        'Начать и закончить встречу может только мастер',
      );
    }
    await master.agent.post(session(gameId)).expect(201);
    await player.agent.delete(session(gameId)).expect(403);
    await t.anonymous().post(`/api/games/${gameId}/session`).expect(401);
  });

  it('пока идёт встреча, лист закрыт на всех маршрутах правки', async () => {
    const { master, player, gameId, characterId } = await seated('gs_lock');
    const owner = player.agent;
    const base = `/api/characters/${characterId}`;
    // Строки инвентаря, способности и эффекта — до встречи, чтобы было что менять.
    const torch = await createItem(owner);
    const added = await owner
      .post(`${base}/items`)
      .send({ itemId: torch.id, quantity: 2, location: 'carried' })
      .expect(201);
    const [entry] = added.body as { id: string }[];
    const ability = await owner
      .post('/api/abilities')
      .send({
        name: 'Второе дыхание',
        category: 'basic',
        details: {},
        description: '',
        isPublic: false,
        activation: { kind: 'bonus_action' },
        costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
      })
      .expect(201);
    const abilityId = (ability.body as { id: string }).id;
    const linked = await owner
      .post(`${base}/abilities`)
      .send({ abilityId })
      .expect(201);
    const [abilityEntry] = linked.body as { id: string }[];
    const effect = await owner
      .post('/api/effects')
      .send(effectBody('Ускорение', 'double'))
      .expect(201);
    const effectId = (effect.body as { id: string }).id;
    const applied = await owner
      .post(`${base}/effects`)
      .send({ effectId })
      .expect(201);
    const [effectEntry] = applied.body as { id: string }[];
    const torch2 = await createItem(owner, { name: 'Верёвка' });
    const secondEffect = await owner
      .post('/api/effects')
      .send(effectBody('Замедление', 'half'))
      .expect(201);

    await master.agent.post(session(gameId)).expect(201);
    const sheet = await owner.get(base).expect(200);
    expect((sheet.body as Character).sheetLock).toEqual({
      gameId,
      gameName: 'Встречная',
    });

    const writes: [string, () => request.Test][] = [
      ['PUT лист', () => owner.put(base).send(characterBody())],
      ['PATCH ХП', () => owner.patch(base).send({ hitPointsCurrent: 1 })],
      [
        'PATCH ячейки',
        () => owner.patch(base).send({ spellSlotsExpended: { '1': 1 } }),
      ],
      [
        'положить предмет',
        () =>
          owner
            .post(`${base}/items`)
            .send({ itemId: torch2.id, quantity: 1, location: 'carried' }),
      ],
      [
        'изменить строку',
        () => owner.patch(`${base}/items/${entry.id}`).send({ quantity: 1 }),
      ],
      [
        'перенести',
        () =>
          owner
            .post(`${base}/items/${entry.id}/move`)
            .send({ location: 'stash', quantity: 1 }),
      ],
      [
        'надеть',
        () =>
          owner.put(`${base}/equipment/meleeMain`).send({ entryId: entry.id }),
      ],
      ['снять', () => owner.delete(`${base}/equipment/meleeMain`)],
      ['настроиться', () => owner.put(`${base}/items/${entry.id}/attunement`)],
      ['убрать предмет', () => owner.delete(`${base}/items/${entry.id}`)],
      [
        'отметить способность',
        () =>
          owner
            .patch(`${base}/abilities/${abilityEntry.id}`)
            .send({ prepared: true }),
      ],
      [
        'убрать способность',
        () => owner.delete(`${base}/abilities/${abilityEntry.id}`),
      ],
      [
        'наложить эффект',
        () =>
          owner
            .post(`${base}/effects`)
            .send({ effectId: (secondEffect.body as { id: string }).id }),
      ],
      ['снять эффект', () => owner.delete(`${base}/effects/${effectEntry.id}`)],
      ['удалить персонажа', () => owner.delete(base)],
    ];
    for (const [label, write] of writes) {
      const res = await write();
      expect(res.status, label).toBe(409);
      expect((res.body as { message: string }).message, label).toBe(
        'Персонаж в игре «Встречная»: идёт встреча, лист закрыт до её конца',
      );
    }
    // Удаление не прошло — место по-прежнему занято, лист цел.
    const lobby = await owner.get(`/api/games/${gameId}`).expect(200);
    expect((lobby.body as GameDetail).seats).toHaveLength(1);
    // Галерея и доступ по ссылке — не лист, они открыты.
    await owner.put(`${base}/access`).send({ linkAccess: 'link' }).expect(200);
    // Чужому — 404, без рассказа об игре.
    await master.agent.patch(base).send({ hitPointsCurrent: 1 }).expect(404);

    // Конец встречи открывает лист.
    await master.agent.delete(session(gameId)).expect(200);
    await owner.patch(base).send({ hitPointsCurrent: 1 }).expect(200);
    await owner.delete(`${base}/effects/${effectEntry.id}`).expect(200);
    await owner.delete(base).expect(204);
  });

  it('освободил место — лист открыт и во время встречи', async () => {
    const { master, player, gameId, characterId } = await seated('gs_free');
    await master.agent.post(session(gameId)).expect(201);
    await player.agent
      .patch(`/api/characters/${characterId}`)
      .send({ hitPointsCurrent: 1 })
      .expect(409);
    await player.agent.delete(`/api/games/${gameId}/seats/me`).expect(200);
    const res = await player.agent
      .patch(`/api/characters/${characterId}`)
      .send({ hitPointsCurrent: 1 })
      .expect(200);
    expect((res.body as Character).sheetLock).toBeNull();
  });
});
