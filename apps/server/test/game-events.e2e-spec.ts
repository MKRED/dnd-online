import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameDetail, GameEventPage } from 'shared';
import { characterBody } from './support/character-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Журнал игры (docs/plan/game.md, этап 2): действия лобби пишутся записями по порядку,
// читает журнал только мастер.
describe('game events (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    // Как в games.e2e-spec.ts: одновременные запросы теста гонки без ECONNRESET.
    await t.app.listen(0);
  });

  afterAll(async () => {
    await t.close();
  });

  async function user(login: string) {
    const agent = await t.loginAs(login);
    const me = await agent.get('/api/auth/me').expect(200);
    return { agent, id: (me.body as { user: { id: string } }).user.id };
  }

  async function character(agent: request.Agent, name: string) {
    const res = await agent
      .post('/api/characters')
      .send(characterBody({ name }))
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function createGame(agent: request.Agent, body = {}) {
    const res = await agent
      .post('/api/games')
      .send({ name: 'Журнальная', seatCount: 4, ...body })
      .expect(201);
    return res.body as GameDetail;
  }

  async function journal(agent: request.Agent, gameId: string, query = '') {
    const res = await agent
      .get(`/api/games/${gameId}/events${query}`)
      .expect(200);
    return res.body as GameEventPage;
  }

  it('пишет действия лобби по порядку, новые сверху', async () => {
    const master = await user('ge_master');
    const game = await createGame(master.agent, { password: 'тайна' });
    const bob = await user('ge_bob');
    const torvald = await character(bob.agent, 'Торвальд');
    const elian = await character(bob.agent, 'Элиан');
    const eve = await user('ge_eve');

    await bob.agent
      .post(`/api/games/${game.id}/enter`)
      .send({ password: 'не та' })
      .expect(403);
    await bob.agent
      .post(`/api/games/${game.id}/enter`)
      .send({ password: 'тайна' })
      .expect(200);
    await bob.agent.post(`/api/games/${game.id}/enter`).send({}).expect(200);
    await bob.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: torvald })
      .expect(201);
    await bob.agent
      .patch(`/api/games/${game.id}/seats/me`)
      .send({ allowHandover: false })
      .expect(200);
    await bob.agent.delete(`/api/games/${game.id}/seats/me`).expect(200);
    await bob.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: elian, allowHandover: false })
      .expect(201);
    await eve.agent
      .post(`/api/games/${game.id}/enter`)
      .send({ password: 'тайна' })
      .expect(200);
    await eve.agent
      .delete(`/api/games/${game.id}/members/${eve.id}`)
      .expect(204);
    await master.agent
      .delete(`/api/games/${game.id}/members/${bob.id}`)
      .expect(204);

    const page = await journal(master.agent, game.id);
    expect(page.hasMore).toBe(false);
    // Неверный пароль и повторный вход ничего не меняют — их в журнале нет, номера идут
    // по записям без пропусков.
    expect(page.events.map((e) => [e.seq, e.kind])).toEqual([
      [9, 'member.removed'],
      [8, 'member.left'],
      [7, 'member.entered'],
      [6, 'seat.taken'],
      [5, 'seat.freed'],
      [4, 'seat.updated'],
      [3, 'seat.taken'],
      [2, 'member.entered'],
      [1, 'game.created'],
    ]);

    const byKind = Object.fromEntries(page.events.map((e) => [e.seq, e]));
    expect(byKind[1]).toMatchObject({
      kind: 'game.created',
      actor: { id: master.id, nickname: 'ge_master' },
      as: { kind: 'master' },
      sceneId: null,
      intent: { name: 'Журнальная', seatCount: 4, hasPassword: true },
      result: null,
    });
    // Пароль в журнал не попадает ни в каком виде.
    expect(JSON.stringify(page.events)).not.toContain('тайна');
    expect(byKind[3]).toMatchObject({
      kind: 'seat.taken',
      actor: { id: bob.id },
      as: null,
      intent: { characterId: torvald, allowHandover: true },
      result: { character: { id: torvald, name: 'Торвальд' } },
    });
    expect(byKind[4]).toMatchObject({
      intent: { allowHandover: false },
      result: { character: { name: 'Торвальд' } },
    });
    expect(byKind[5]).toMatchObject({
      result: { character: { name: 'Торвальд' }, reason: 'freed' },
    });
    expect(byKind[8]).toMatchObject({
      kind: 'member.left',
      actor: { id: eve.id },
      result: { character: null },
    });
    expect(byKind[9]).toMatchObject({
      kind: 'member.removed',
      actor: { id: master.id },
      as: { kind: 'master' },
      intent: { userId: bob.id },
      result: {
        member: { id: bob.id, nickname: 'ge_bob' },
        character: { id: elian, name: 'Элиан' },
      },
    });
  });

  it('страницы журнала: before и limit', async () => {
    const master = await user('ge_page_master');
    const game = await createGame(master.agent);
    for (const login of ['ge_p1', 'ge_p2', 'ge_p3']) {
      const p = await user(login);
      await p.agent.post(`/api/games/${game.id}/enter`).send({}).expect(200);
    }

    const first = await journal(master.agent, game.id, '?limit=2');
    expect(first.events.map((e) => e.seq)).toEqual([4, 3]);
    expect(first.hasMore).toBe(true);
    const second = await journal(master.agent, game.id, '?limit=2&before=3');
    expect(second.events.map((e) => e.seq)).toEqual([2, 1]);
    expect(second.hasMore).toBe(false);

    for (const query of ['?limit=0', '?limit=101', '?before=0', '?before=x']) {
      await master.agent
        .get(`/api/games/${game.id}/events${query}`)
        .expect(400);
    }
  });

  it('удаление персонажа на месте освобождает место записью журнала', async () => {
    const master = await user('ge_del_master');
    const game = await createGame(master.agent);
    const bob = await user('ge_del_bob');
    const hero = await character(bob.agent, 'Обречённый');
    await bob.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: hero })
      .expect(201);

    // Чужой персонаж не удаляется, и журнал не трогается.
    await master.agent.delete(`/api/characters/${hero}`).expect(404);
    expect((await journal(master.agent, game.id)).events).toHaveLength(2);

    await bob.agent.delete(`/api/characters/${hero}`).expect(204);
    const [last] = (await journal(master.agent, game.id)).events;
    expect(last).toMatchObject({
      seq: 3,
      kind: 'seat.freed',
      actor: { id: bob.id },
      result: {
        character: { id: hero, name: 'Обречённый' },
        reason: 'character_deleted',
      },
    });
    const lobby = await bob.agent.get(`/api/games/${game.id}`).expect(200);
    expect(lobby.body as GameDetail).toMatchObject({
      role: 'member',
      seats: [],
    });
  });

  it('одновременные входы: одна запись на игрока, номера без пропусков', async () => {
    const master = await user('ge_race_master');
    const game = await createGame(master.agent, { seatCount: 8 });
    const players = await Promise.all(
      ['ge_r1', 'ge_r2', 'ge_r3', 'ge_r4', 'ge_r5', 'ge_r6'].map(user),
    );
    // Каждый жмёт «Войти» дважды разом (две вкладки): оба запроса ещё не видят его
    // участником, и запись должна появиться одна.
    await Promise.all(
      players.flatMap((p) =>
        [1, 2].map(() =>
          p.agent.post(`/api/games/${game.id}/enter`).send({}).expect(200),
        ),
      ),
    );
    const { events } = await journal(master.agent, game.id);
    expect(events.map((e) => e.seq)).toEqual([7, 6, 5, 4, 3, 2, 1]);
  });

  it('журнал видит только мастер', async () => {
    const master = await user('ge_acl_master');
    const game = await createGame(master.agent);
    const bob = await user('ge_acl_bob');
    const hero = await character(bob.agent, 'Зритель');
    const stranger = await user('ge_acl_stranger');

    // Чужой — и в открытой игре, где лобби ему видно.
    await stranger.agent.get(`/api/games/${game.id}/events`).expect(403);
    await bob.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: hero })
      .expect(201);
    const res = await bob.agent.get(`/api/games/${game.id}/events`).expect(403);
    expect((res.body as { message: string }).message).toBe(
      'Журнал игры видит только мастер',
    );
    await t.anonymous().get(`/api/games/${game.id}/events`).expect(401);
    await master.agent
      .get('/api/games/00000000-0000-4000-8000-000000000000/events')
      .expect(404);
    await master.agent.get('/api/games/not-a-uuid/events').expect(400);
  });
});
