import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  GAME_SOCKET,
  type GameChangedMessage,
  type GameClosedMessage,
  type GameDetail,
  type GameEventMessage,
  type GamePresenceMessage,
} from 'shared';
import { characterBody } from './support/character-fixture.js';
import {
  collect,
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Сокет игры (docs/plan/done/game.md, этап 3): вход по cookie, комната, присутствие,
// рассылка изменений и закрытие комнаты для убранного игрока.
describe('game socket (e2e)', () => {
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
  const connect = (cookie?: string) => clients.connect(cookie);

  async function createGame(agent: request.Agent, body = {}) {
    const res = await agent
      .post('/api/games')
      .send({ name: 'Сокетная', seatCount: 4, ...body })
      .expect(201);
    return res.body as GameDetail;
  }

  it('без сессии сокет не открывается', async () => {
    await expect(connect()).rejects.toThrow('unauthorized');
    await expect(connect('access_token=forged.token.value')).rejects.toThrow(
      'unauthorized',
    );
  });

  it('в комнату пускает тот же доступ, что и в лобби', async () => {
    const master = await user('gso_acl_master');
    const game = await createGame(master.agent, { password: 'тайна' });
    const stranger = await user('gso_acl_stranger');

    const strangerSocket = await connect(stranger.cookie);
    expect(await join(strangerSocket, game.id)).toEqual({
      ok: false,
      error: 'Игра закрыта паролем',
    });
    expect(await join(strangerSocket, 'not-a-uuid')).toEqual({
      ok: false,
      error: 'Игра не найдена',
    });
    expect(
      await join(strangerSocket, '00000000-0000-4000-8000-000000000000'),
    ).toEqual({ ok: false, error: 'Игра не найдена' });
    // Изменений закрытой игры не получает.
    const leaked = collect(strangerSocket, GAME_SOCKET.changed);
    await master.agent.post(`/api/games/${game.id}/session`).expect(201);
    expect(await leaked).toEqual([]);

    const masterSocket = await connect(master.cookie);
    const ack = await join(masterSocket, game.id);
    expect(ack).toEqual({
      ok: true,
      seq: 2,
      online: [master.id],
      missed: null,
    });
  });

  it('изменения — всем в комнате, записи журнала — только мастеру; присутствие', async () => {
    const master = await user('gso_live_master');
    const game = await createGame(master.agent);
    const bob = await user('gso_live_bob');
    const masterSocket = await connect(master.cookie);
    await join(masterSocket, game.id);

    // Боб открывает лобби: мастер видит его в сети.
    const bobSocket = await connect(bob.cookie);
    const appeared = next<GamePresenceMessage>(
      masterSocket,
      GAME_SOCKET.presence,
    );
    const bobAck = await join(bobSocket, game.id);
    expect(bobAck).toMatchObject({ ok: true, missed: null });
    expect((await appeared).online.sort()).toEqual([master.id, bob.id].sort());

    // Боб садится: изменение приходит обоим, сама запись — только мастеру.
    const character = await bob.agent
      .post('/api/characters')
      .send(characterBody({ name: 'Живой' }))
      .expect(201);
    const toMaster = next<GameEventMessage>(masterSocket, GAME_SOCKET.event);
    const changedForBob = next<GameChangedMessage>(
      bobSocket,
      GAME_SOCKET.changed,
    );
    const bobEvents = collect<GameEventMessage>(bobSocket, GAME_SOCKET.event);
    await bob.agent
      .post(`/api/games/${game.id}/seats`)
      .send({ characterId: (character.body as { id: string }).id })
      .expect(201);
    expect((await toMaster).event).toMatchObject({
      seq: 2,
      kind: 'seat.taken',
      result: { character: { name: 'Живой' } },
    });
    expect(await changedForBob).toEqual({
      gameId: game.id,
      seq: 2,
      kind: 'seat.taken',
    });
    expect(await bobEvents).toEqual([]);

    // Удаление персонажа освобождает место — и это тоже приходит по сокету.
    const freed = next<GameChangedMessage>(
      masterSocket,
      GAME_SOCKET.changed,
      (m) => m.kind === 'seat.freed',
    );
    await bob.agent
      .delete(`/api/characters/${(character.body as { id: string }).id}`)
      .expect(204);
    expect((await freed).seq).toBe(3);

    // Боб закрыл вкладку — мастер видит, что он ушёл.
    const gone = next<GamePresenceMessage>(masterSocket, GAME_SOCKET.presence);
    bobSocket.disconnect();
    expect((await gone).online).toEqual([master.id]);
  });

  it('мастер после переподключения получает пропущенные записи', async () => {
    const master = await user('gso_catch_master');
    const game = await createGame(master.agent);
    for (const login of ['gso_c1', 'gso_c2']) {
      const p = await user(login);
      await p.agent.post(`/api/games/${game.id}/enter`).send({}).expect(200);
    }
    const masterSocket = await connect(master.cookie);
    const ack = await join(masterSocket, game.id, 1);
    expect(ack).toMatchObject({ ok: true, seq: 3 });
    expect(ack.ok && ack.missed?.map((e) => [e.seq, e.kind])).toEqual([
      [2, 'member.entered'],
      [3, 'member.entered'],
    ]);
    // Не мастеру пропущенное не отдаётся: журнал видит только мастер.
    const p = await user('gso_c3');
    const playerSocket = await connect(p.cookie);
    expect(await join(playerSocket, game.id, 0)).toMatchObject({
      ok: true,
      missed: null,
    });
  });

  it('убранный из закрытой игры теряет комнату', async () => {
    const master = await user('gso_kick_master');
    const game = await createGame(master.agent, { password: 'тайна' });
    const bob = await user('gso_kick_bob');
    await bob.agent
      .post(`/api/games/${game.id}/enter`)
      .send({ password: 'тайна' })
      .expect(200);
    const bobSocket = await connect(bob.cookie);
    expect(await join(bobSocket, game.id)).toMatchObject({ ok: true });

    const closed = next<GameClosedMessage>(bobSocket, GAME_SOCKET.closed);
    await master.agent
      .delete(`/api/games/${game.id}/members/${bob.id}`)
      .expect(204);
    expect(await closed).toEqual({ gameId: game.id, reason: 'removed' });

    // Дальше изменения игры к нему не идут.
    const leaked = collect(bobSocket, GAME_SOCKET.changed);
    await master.agent.post(`/api/games/${game.id}/session`).expect(201);
    expect(await leaked).toEqual([]);
  });

  it('удалённая игра закрывает комнату у всех', async () => {
    const master = await user('gso_del_master');
    const game = await createGame(master.agent);
    const bob = await user('gso_del_bob');
    const bobSocket = await connect(bob.cookie);
    await join(bobSocket, game.id);

    const closed = next<GameClosedMessage>(bobSocket, GAME_SOCKET.closed);
    await master.agent.delete(`/api/games/${game.id}`).expect(204);
    expect(await closed).toEqual({ gameId: game.id, reason: 'deleted' });
  });
});
