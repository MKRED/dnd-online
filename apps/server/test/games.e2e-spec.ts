import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameDetail, GameListItem } from 'shared';
import { characterBody } from './support/character-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

interface Player {
  agent: request.Agent;
  id: string;
  characterId: string;
}

describe('games (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    // Сервер слушает порт сам: иначе supertest открывает и закрывает свой на каждый
    // запрос, и одновременные запросы теста гонки рвутся (ECONNRESET).
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

  async function character(agent: request.Agent, over = {}) {
    const res = await agent
      .post('/api/characters')
      .send(characterBody(over))
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function player(login: string): Promise<Player> {
    const u = await user(login);
    return { ...u, characterId: await character(u.agent) };
  }

  async function createGame(agent: request.Agent, body = {}) {
    const res = await agent
      .post('/api/games')
      .send({ name: 'Подземелье', seatCount: 4, ...body })
      .expect(201);
    return res.body as GameDetail;
  }

  function enter(agent: request.Agent, gameId: string, password?: string) {
    return agent.post(`/api/games/${gameId}/enter`).send({ password });
  }

  function sit(p: Player, gameId: string, body = {}) {
    return p.agent
      .post(`/api/games/${gameId}/seats`)
      .send({ characterId: p.characterId, ...body });
  }

  it('мастер создаёт игру, её видят все, игрок занимает место', async () => {
    const master = await user('g_master');
    const game = await createGame(master.agent, { seatCount: 3 });
    expect(game).toMatchObject({
      name: 'Подземелье',
      seatCount: 3,
      takenSeats: 0,
      hasPassword: false,
      role: 'master',
      master: { id: master.id, nickname: 'g_master' },
      seats: [],
    });
    expect(game).not.toHaveProperty('passwordHash');

    const alice = await player('g_alice');
    const list = await alice.agent.get('/api/games').expect(200);
    expect(
      (list.body as GameListItem[]).find((g) => g.id === game.id),
    ).toMatchObject({ role: null, takenSeats: 0 });

    // Открытое лобби видно и без входа.
    const look = await alice.agent.get(`/api/games/${game.id}`).expect(200);
    expect(look.body as GameDetail).toMatchObject({ role: null, seats: [] });

    const res = await sit(alice, game.id, { allowHandover: false }).expect(201);
    const detail = res.body as GameDetail;
    expect(detail).toMatchObject({ role: 'player', takenSeats: 1 });
    expect(detail.seats).toEqual([
      expect.objectContaining({
        user: { id: alice.id, nickname: 'g_alice' },
        character: {
          id: alice.characterId,
          name: 'Торин',
          species: 'dwarf',
          classes: [{ class: 'fighter', level: 1 }],
        },
        allowHandover: false,
      }),
    ]);

    // Свои игры — первыми в списке.
    await createGame(master.agent, { name: 'Чужая для Алисы' });
    const after = (await alice.agent.get('/api/games').expect(200))
      .body as GameListItem[];
    expect(after[0]).toMatchObject({ id: game.id, role: 'player' });
  });

  it('в закрытое лобби пускает пароль, введённый один раз', async () => {
    const master = await user('g_lock_master');
    const game = await createGame(master.agent, { password: 'секрет' });
    expect(game.hasPassword).toBe(true);
    const bob = await player('g_lock_bob');
    // В списке игра видна, лобби — нет.
    const list = (await bob.agent.get('/api/games').expect(200))
      .body as GameListItem[];
    expect(list.find((g) => g.id === game.id)).toMatchObject({
      hasPassword: true,
      role: null,
    });
    const locked = await bob.agent.get(`/api/games/${game.id}`).expect(403);
    expect((locked.body as { message: string }).message).toBe(
      'Игра закрыта паролем',
    );
    await sit(bob, game.id).expect(403);
    await enter(bob.agent, game.id).expect(403);
    await enter(bob.agent, game.id, 'не тот').expect(403);
    const entered = await enter(bob.agent, game.id, 'секрет').expect(200);
    expect(entered.body as GameDetail).toMatchObject({
      role: 'member',
      seats: [],
    });
    // Дальше — без пароля: и лобби, и место.
    await bob.agent.get(`/api/games/${game.id}`).expect(200);
    await enter(bob.agent, game.id).expect(200);
    await sit(bob, game.id).expect(201);
    // Мастеру пароль не нужен.
    await enter(master.agent, game.id).expect(200);
  });

  it('пустой пароль — игра открытая', async () => {
    const master = await user('g_open_master');
    const game = await createGame(master.agent, { password: '' });
    expect(game.hasPassword).toBe(false);
  });

  it('мест не больше, чем задал мастер', async () => {
    const master = await user('g_full_master');
    const game = await createGame(master.agent, { seatCount: 1 });
    await sit(await player('g_full_a'), game.id).expect(201);
    const late = await sit(await player('g_full_b'), game.id).expect(409);
    expect((late.body as { message: string }).message).toBe(
      'Свободных мест нет',
    );
  });

  it('последнее место при одновременном входе достаётся одному', async () => {
    const master = await user('g_race_master');
    const game = await createGame(master.agent, { seatCount: 1 });
    // Игроков несколько: так запросы наверняка пересекаются между проверкой и записью.
    const players = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((n) => player(`g_race_${n}`)),
    );
    const results = await Promise.all(players.map((p) => sit(p, game.id)));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    const detail = await master.agent.get(`/api/games/${game.id}`).expect(200);
    expect((detail.body as GameDetail).seats).toHaveLength(1);
  });

  it('персонаж — только в одной игре, игрок — одно место в игре', async () => {
    const master = await user('g_one_master');
    const first = await createGame(master.agent, { name: 'Первая' });
    const second = await createGame(master.agent, { name: 'Вторая' });
    const carol = await player('g_one_carol');
    await sit(carol, first.id).expect(201);
    const again = await sit(carol, second.id).expect(409);
    expect((again.body as { message: string }).message).toBe(
      'Персонаж уже в игре «Первая»',
    );
    const other = await character(carol.agent, { name: 'Второй' });
    await carol.agent
      .post(`/api/games/${first.id}/seats`)
      .send({ characterId: other })
      .expect(409);
  });

  it('садиться можно только своим игровым персонажем, мастеру — нельзя', async () => {
    const master = await user('g_who_master');
    const game = await createGame(master.agent);
    const dave = await player('g_who_dave');
    const eve = await user('g_who_eve');
    // Чужой персонаж неотличим от несуществующего.
    await eve.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: dave.characterId })
      .expect(404);
    const npc = await character(eve.agent, { kind: 'npc' });
    await eve.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: npc })
      .expect(400);
    const own = await character(master.agent);
    await master.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: own })
      .expect(409);
  });

  it('игрок меняет разрешение, освобождает место и выходит из игры', async () => {
    const master = await user('g_leave_master');
    const game = await createGame(master.agent, { password: 'пароль' });
    const frank = await player('g_leave_frank');
    await enter(frank.agent, game.id, 'пароль').expect(200);
    await sit(frank, game.id).expect(201);
    const patched = await frank.agent
      .patch(`/api/games/${game.id}/seats/me`)
      .send({ allowHandover: false })
      .expect(200);
    expect((patched.body as GameDetail).seats[0].allowHandover).toBe(false);
    // Освободил место — остался в лобби.
    const freed = await frank.agent
      .delete(`/api/games/${game.id}/seats/me`)
      .expect(200);
    expect(freed.body as GameDetail).toMatchObject({
      role: 'member',
      seats: [],
    });
    await frank.agent
      .patch(`/api/games/${game.id}/seats/me`)
      .send({ allowHandover: true })
      .expect(404);
    await frank.agent.delete(`/api/games/${game.id}/seats/me`).expect(404);
    // Вышел из игры — в закрытое лобби снова только с паролем.
    await frank.agent
      .delete(`/api/games/${game.id}/members/${frank.id}`)
      .expect(204);
    await frank.agent.get(`/api/games/${game.id}`).expect(403);
    await master.agent
      .delete(`/api/games/${game.id}/members/${master.id}`)
      .expect(409);
  });

  it('убрать другого игрока может только мастер', async () => {
    const master = await user('g_kick_master');
    const game = await createGame(master.agent, { password: 'пароль' });
    const gina = await player('g_kick_gina');
    const hank = await player('g_kick_hank');
    for (const p of [gina, hank]) {
      await enter(p.agent, game.id, 'пароль').expect(200);
      await sit(p, game.id).expect(201);
    }
    await hank.agent
      .delete(`/api/games/${game.id}/members/${gina.id}`)
      .expect(403);
    await master.agent
      .delete(`/api/games/${game.id}/members/${gina.id}`)
      .expect(204);
    const res = await master.agent.get(`/api/games/${game.id}`).expect(200);
    expect((res.body as GameDetail).seats.map((s) => s.user.nickname)).toEqual([
      'g_kick_hank',
    ]);
    // Убранный теряет и место, и вход; персонаж свободен для другой игры.
    await gina.agent.get(`/api/games/${game.id}`).expect(403);
    const other = await createGame(master.agent);
    await sit(gina, other.id).expect(201);
  });

  it('игру удаляет только мастер, места уходят вместе с ней', async () => {
    const master = await user('g_del_master');
    const game = await createGame(master.agent);
    const ivy = await player('g_del_ivy');
    await sit(ivy, game.id).expect(201);
    await ivy.agent.delete(`/api/games/${game.id}`).expect(403);
    await master.agent.delete(`/api/games/${game.id}`).expect(204);
    await ivy.agent.get(`/api/games/${game.id}`).expect(404);
    const next = await createGame(master.agent);
    await sit(ivy, next.id).expect(201);
  });

  it('удалённый персонаж освобождает место, игрок остаётся в лобби', async () => {
    const master = await user('g_gone_master');
    const game = await createGame(master.agent);
    const jack = await player('g_gone_jack');
    await sit(jack, game.id).expect(201);
    await jack.agent.delete(`/api/characters/${jack.characterId}`).expect(204);
    const res = await jack.agent.get(`/api/games/${game.id}`).expect(200);
    expect(res.body as GameDetail).toMatchObject({
      role: 'member',
      takenSeats: 0,
      seats: [],
    });
  });

  it('неверные данные — 400, без входа — 401', async () => {
    const master = await user('g_bad_master');
    await master.agent
      .post('/api/games')
      .send({ name: '  ', seatCount: 4 })
      .expect(400);
    await master.agent
      .post('/api/games')
      .send({ name: 'Много', seatCount: 9 })
      .expect(400);
    await master.agent
      .post('/api/games')
      .send({ name: 'Ноль', seatCount: 0 })
      .expect(400);
    const game = await createGame(master.agent);
    await master.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: 'не-uuid' })
      .expect(400);
    await master.agent.get('/api/games/not-a-uuid').expect(400);
    await master.agent
      .get('/api/games/00000000-0000-4000-8000-000000000000')
      .expect(404);

    const anon = t.anonymous();
    await anon.get('/api/games').expect(401);
    await anon.post('/api/games').send({ name: 'x', seatCount: 1 }).expect(401);
    await anon.get(`/api/games/${game.id}`).expect(401);
    await anon.post(`/api/games/${game.id}/enter`).send({}).expect(401);
    await anon.post(`/api/games/${game.id}/seats`).send({}).expect(401);
    await anon.delete(`/api/games/${game.id}`).expect(401);
  });
});
