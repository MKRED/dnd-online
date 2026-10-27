import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type {
  GameCombat,
  GameCombatRoll,
  GameEvent,
  GameEventPage,
  GameFigures,
  GameScenes,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import {
  createSceneGame,
  fogOff,
  startSession,
} from './support/scene-fixture.js';
import {
  listenForSockets,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Бой с очерёдностью (docs/plan/combat.md, этап 2): мастер зовёт участников, каждый бросает
// инициативу на сервере, очередь по числу с ничьими, ходы по очереди с полным запасом в
// начале своего хода; игрок ходит только в свой ход.
describe('game combat (e2e)', () => {
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

  // Сцена из карты фикстуры: поле 8×8, фигурка игрока на [0,1,0] (Ловкость 12), объект 2 —
  // гоблин (инициатива 0), 3 — НПС «Трактирщик». Сцена активная, открыта, без тумана,
  // встреча идёт, режим свободный.
  async function started(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const res = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (res.body as GameScenes).scenes[0].id;
    await fogOff(m, g.gameId, sceneId);
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await startSession(m, g.gameId);
    const url = `/api/games/${g.gameId}/combat`;
    const figure = { kind: 'figure', characterId: g.character };
    const goblin = { kind: 'creature', objectId: 2 };
    const npc = { kind: 'creature', objectId: 3 };
    const read = async (agent: request.Agent) =>
      (await agent.get(url).expect(200)).body as GameCombat;
    const start = (participants: object[], status = 200) =>
      m.post(`${url}/start`).send({ participants }).expect(status);
    // Участник по тому, кто он на сцене.
    const idOf = (combat: GameCombat, ref: object) =>
      combat.combatants.find(
        (c) => JSON.stringify(c.ref) === JSON.stringify(ref),
      )!.id;
    const setInitiative = (id: string, initiative: number, status = 200) =>
      m
        .put(`${url}/combatants/${id}/initiative`)
        .send({ initiative })
        .expect(status);
    const endTurn = (agent: request.Agent, combatantId: string, status = 200) =>
      agent.post(`${url}/turn/end`).send({ combatantId }).expect(status);
    const move = (agent: request.Agent, to: number[], status = 200) =>
      agent
        .post(`/api/games/${g.gameId}/figures/${g.character}/move`)
        .send({ to })
        .expect(status);
    return {
      ...g,
      m,
      p: g.player.agent,
      sceneId,
      url,
      figure,
      goblin,
      npc,
      read,
      start,
      idOf,
      setInitiative,
      endTurn,
      move,
    };
  }

  async function events(agent: request.Agent, gameId: string, limit: number) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=${limit}`)
      .expect(200);
    return (res.body as GameEventPage).events;
  }

  const message = (res: request.Response) =>
    (res.body as { message: string }).message;

  async function figureOf(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/scene/figures`)
      .expect(200);
    return res.body as GameFigures;
  }

  it('начало боя, бросок игрока и монстров, ходы по очереди и новый раунд', async () => {
    const g = await started('gcb_flow');
    const res = await g.start([
      g.figure,
      g.goblin,
      { ...g.npc, surprised: true },
    ]);
    let combat = res.body as GameCombat;
    expect(combat).toMatchObject({ round: 1, turn: null, candidates: [] });
    expect(combat.combatants.map((c) => [c.name, c.initiative])).toEqual([
      ['Зритель', null],
      ['Гоблин', null],
      ['Трактирщик', null],
    ]);
    expect((await figureOf(g.m, g.gameId)).mode).toBe('tactical');
    const [first, second] = await events(g.m, g.gameId, 2);
    expect(first).toMatchObject({
      kind: 'combat.started',
      result: { count: 3 },
      visibility: 'players',
    });
    expect(second).toMatchObject({ kind: 'game.mode' });
    // Уже идёт — второй раз не начать.
    expect(message(await g.start([g.figure], 409))).toBe(
      'Бой с очерёдностью уже идёт',
    );

    // Игрок видит участников; бросает только за свою фигурку.
    const seen = await g.read(g.p);
    expect(seen.combatants.map((c) => [c.name, c.canRoll])).toEqual([
      ['Зритель', true],
      ['Гоблин', false],
      ['Трактирщик', false],
    ]);
    // «Врасплох» существа игроку не видно.
    expect(seen.combatants[2].surprised).toBe(false);
    // Окну броска — слагаемые заранее, только своему; чужому — ничего.
    expect(seen.combatants[0].pending).toEqual({
      terms: [{ kind: 'number', label: 'Ловкость', amount: 1 }],
      reasons: { advantage: [], disadvantage: [] },
    });
    expect(seen.combatants[1].pending).toBeNull();
    const own = g.idOf(seen, g.figure);
    const goblinId = g.idOf(seen, g.goblin);
    const npcId = g.idOf(seen, g.npc);

    // Пока бросают инициативу, игрок не ходит.
    expect(message(await g.move(g.p, [0, 1, 2], 409))).toBe(
      'Сейчас не ваш ход',
    );
    expect(
      message(
        await g.p
          .post(`${g.url}/combatants/${goblinId}/initiative`)
          .send({})
          .expect(403),
      ),
    ).toBe('Бросить инициативу можно только за свою фигурку');
    await g.p
      .post(`${g.url}/combatants/${own}/initiative`)
      .send({ mode: 'advantage' })
      .expect(403);

    const rolled = await g.p
      .post(`${g.url}/combatants/${own}/initiative`)
      .send({})
      .expect(200);
    const { roll, combat: afterRoll } = rolled.body as GameCombatRoll;
    expect(roll).toMatchObject({
      mode: 'normal',
      kept: 0,
      master: null,
      terms: [{ kind: 'number', label: 'Ловкость', amount: 1 }],
    });
    expect(roll.dice).toHaveLength(1);
    expect(roll.total).toBe(roll.dice[0] + 1);
    expect(afterRoll.combatants[0]).toMatchObject({
      id: own,
      initiative: roll.total,
      roll,
      pending: null,
    });
    expect((await events(g.m, g.gameId, 1))[0]).toMatchObject({
      kind: 'combat.initiative',
      as: { kind: 'character', id: g.character },
      result: { combatant: { id: own, name: 'Зритель' }, place: 0 },
      visibility: 'players',
    });
    await g.p
      .post(`${g.url}/combatants/${own}/initiative`)
      .send({})
      .expect(409);

    // Мастер ставит числа: фигурка 30, гоблин 25; НПС бросает «за монстров» с помехой.
    await g.setInitiative(own, 30);
    await g.setInitiative(goblinId, 25);
    combat = (
      await g.m.post(`${g.url}/initiative/creatures`).send({}).expect(200)
    ).body as GameCombat;
    expect(combat.combatants.map((c) => c.id)).toEqual([own, goblinId, npcId]);
    expect(combat.turn).toBe(own);
    expect(combat.combatants[2].roll).toMatchObject({
      mode: 'disadvantage',
      reasons: { advantage: [], disadvantage: ['Врасплох'] },
    });
    expect(combat.combatants[2].roll?.dice).toHaveLength(2);
    expect((await events(g.m, g.gameId, 1))[0]).toMatchObject({
      kind: 'combat.turn',
      intent: { reason: 'start' },
      result: { combatant: { id: own }, round: 1, newRound: true },
    });

    // Свой ход: игрок ходит, заканчивает ход; дальше — гоблин.
    await g.move(g.p, [0, 1, 2]);
    expect(
      message(
        await g.m.post(`/api/games/${g.gameId}/figures/round`).expect(409),
      ),
    ).toBe('В бою с очерёдностью раунд меняется сам, когда походили все');
    combat = (await g.endTurn(g.p, own)).body as GameCombat;
    expect(combat.turn).toBe(goblinId);
    expect(message(await g.endTurn(g.p, own, 409))).toBe(
      'Этот ход уже закончен',
    );
    await g.endTurn(g.p, goblinId, 403);
    expect(message(await g.move(g.p, [0, 1, 3], 409))).toBe(
      'Сейчас не ваш ход',
    );
    expect((await figureOf(g.m, g.gameId)).figures[0].moved).toBe(10);

    // Мастер ведёт существ; после последнего — новый раунд, у фигурки снова полный запас.
    await g.endTurn(g.m, goblinId);
    combat = (await g.endTurn(g.m, npcId)).body as GameCombat;
    expect(combat).toMatchObject({ round: 2, turn: own });
    expect((await figureOf(g.m, g.gameId)).figures[0].moved).toBe(0);
    expect((await events(g.m, g.gameId, 1))[0]).toMatchObject({
      kind: 'combat.turn',
      intent: { reason: 'end', combatantId: own },
      result: { round: 2, newRound: true, from: { id: npcId } },
    });

    // Конец боя: участников нет, игрок ходит как раньше.
    await g.m
      .put(`/api/games/${g.gameId}/figures/mode`)
      .send({ mode: 'free' })
      .expect(200);
    expect(await g.read(g.p)).toMatchObject({
      round: null,
      turn: null,
      combatants: [],
    });
    await g.move(g.p, [0, 1, 4]);
  });

  it('мастер переставляет очередь, отдаёт ход, зовёт новичка и убирает ушедшего', async () => {
    const g = await started('gcb_roster');
    let combat = (await g.start([g.figure, g.goblin])).body as GameCombat;
    expect(combat.candidates).toEqual([
      { kind: 'creature', objectId: 3, name: 'Трактирщик', seen: true },
    ]);
    const own = g.idOf(combat, g.figure);
    const goblinId = g.idOf(combat, g.goblin);
    await g.setInitiative(own, 10);
    combat = (await g.setInitiative(goblinId, 5)).body as GameCombat;
    expect(combat).toMatchObject({ turn: own, round: 1 });

    // Очередь — все бросившие по разу.
    await g.m
      .put(`${g.url}/order`)
      .send({ ids: [own] })
      .expect(400);
    await g.p
      .put(`${g.url}/order`)
      .send({ ids: [goblinId, own] })
      .expect(403);
    combat = (
      await g.m
        .put(`${g.url}/order`)
        .send({ ids: [goblinId, own] })
        .expect(200)
    ).body as GameCombat;
    expect(combat.combatants.map((c) => c.id)).toEqual([goblinId, own]);
    expect(combat.turn).toBe(own);

    // Ход — любому бросившему; раунд тот же.
    await g.p.put(`${g.url}/turn`).send({ combatantId: goblinId }).expect(403);
    combat = (
      await g.m.put(`${g.url}/turn`).send({ combatantId: goblinId }).expect(200)
    ).body as GameCombat;
    expect(combat).toMatchObject({ turn: goblinId, round: 1 });

    // Новичок: ещё не бросил — в конце списка; потом встаёт перед первым, кто ему уступает.
    combat = (
      await g.m
        .post(`${g.url}/combatants`)
        .send({ participants: [g.npc] })
        .expect(200)
    ).body as GameCombat;
    const npcId = g.idOf(combat, g.npc);
    expect(combat.combatants.map((c) => [c.id, c.initiative])).toEqual([
      [goblinId, 5],
      [own, 10],
      [npcId, null],
    ]);
    expect(combat.candidates).toEqual([]);
    expect((await events(g.m, g.gameId, 1))[0]).toMatchObject({
      kind: 'combat.joined',
      result: { combatant: { id: npcId, name: 'Трактирщик' } },
      visibility: 'players',
    });
    expect(
      message(
        await g.m
          .post(`${g.url}/combatants`)
          .send({ participants: [g.npc] })
          .expect(409),
      ),
    ).toBe('Уже в бою');
    await g.m
      .post(`${g.url}/combatants`)
      .send({ participants: [{ kind: 'creature', objectId: 99 }] })
      .expect(404);
    combat = (await g.setInitiative(npcId, 7)).body as GameCombat;
    expect(combat.combatants.map((c) => c.id)).toEqual([npcId, goblinId, own]);

    // Уходит тот, чей ход, — ход переходит к следующему.
    await g.p.delete(`${g.url}/combatants/${goblinId}`).expect(403);
    combat = (await g.m.delete(`${g.url}/combatants/${goblinId}`).expect(200))
      .body as GameCombat;
    expect(combat.combatants.map((c) => c.id)).toEqual([npcId, own]);
    expect(combat.turn).toBe(own);
    const [turn, left] = await events(g.m, g.gameId, 2);
    expect(left).toMatchObject({
      kind: 'combat.left',
      result: { combatant: { id: goblinId }, turnPassed: true },
    });
    expect(turn).toMatchObject({
      kind: 'combat.turn',
      intent: { reason: 'left' },
      result: { combatant: { id: own }, newRound: false },
    });
  });

  it('скрытое от игроков существо: не в их очереди, его ход и бросок — только мастеру', async () => {
    const g = await started('gcb_hidden');
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/ops`)
      .send({ ops: [{ op: 'updateObject', id: 2, object: { hidden: true } }] })
      .expect(200);
    let combat = (await g.start([g.figure, g.goblin])).body as GameCombat;
    const own = g.idOf(combat, g.figure);
    const goblinId = g.idOf(combat, g.goblin);
    await g.setInitiative(own, 5);
    combat = (await g.setInitiative(goblinId, 20)).body as GameCombat;
    expect(combat.turn).toBe(goblinId);
    const [turn, set] = await events(g.m, g.gameId, 2);
    expect(set).toMatchObject({
      kind: 'combat.initiative_set',
      visibility: 'master',
    });
    expect(turn).toMatchObject({ kind: 'combat.turn', visibility: 'master' });

    const seen = await g.read(g.p);
    expect(seen.combatants.map((c) => c.id)).toEqual([own]);
    expect(seen.turn).toBeNull();
    // Кандидатов игрок не видит; у мастера скрытый — не «видит партия».
    expect(seen.candidates).toEqual([]);
    expect((await g.read(g.m)).candidates).toEqual([
      { kind: 'creature', objectId: 3, name: 'Трактирщик', seen: true },
    ]);
  });

  it('эффекты на броске: Невидимый — преимущество; мастер переключает помеху', async () => {
    const g = await started('gcb_effects');
    const effectId = (
      await g.m
        .post('/api/effects')
        .send({
          name: 'Невидимость',
          components: [{ kind: 'condition', condition: 'invisible' }],
          description: '',
          isPublic: false,
          duration: { kind: 'permanent' },
          saveEnds: null,
        })
        .expect(201)
    ).body as { id: string };
    await g.m
      .post(`/api/games/${g.gameId}/characters/${g.character}/effects`)
      .send({ effectId: effectId.id })
      .expect(201);
    await g.m
      .post(`/api/games/${g.gameId}/scene/creatures/2/effects`)
      .send({ effectId: effectId.id })
      .expect(201);
    const combat = (await g.start([g.figure, g.goblin])).body as GameCombat;
    const own = g.idOf(combat, g.figure);
    const goblinId = g.idOf(combat, g.goblin);
    // Мастеру до броска видно, откуда преимущество.
    expect(
      combat.combatants.find((c) => c.id === goblinId)?.pending,
    ).toMatchObject({
      reasons: { advantage: ['Невидимый'], disadvantage: [] },
    });

    const player = (
      await g.p.post(`${g.url}/combatants/${own}/initiative`).expect(200)
    ).body as GameCombatRoll;
    expect(player.roll).toMatchObject({
      mode: 'advantage',
      reasons: { advantage: ['Невидимый'], disadvantage: [] },
    });
    expect(player.roll.dice).toHaveLength(2);
    expect(player.roll.dice[player.roll.kept]).toBe(
      Math.max(...player.roll.dice),
    );

    const master = (
      await g.m
        .post(`${g.url}/combatants/${goblinId}/initiative`)
        .send({ mode: 'disadvantage' })
        .expect(200)
    ).body as GameCombatRoll;
    expect(master.roll).toMatchObject({
      mode: 'disadvantage',
      master: 'disadvantage',
      reasons: { advantage: ['Невидимый'], disadvantage: [] },
      terms: [{ kind: 'number', label: 'Инициатива', amount: 0 }],
    });
    expect(master.roll.dice[master.roll.kept]).toBe(
      Math.min(...master.roll.dice),
    );
    // Бросок существа игрок не видит.
    const seen = await g.read(g.p);
    expect(seen.combatants.find((c) => c.id === goblinId)?.roll).toBeNull();
    const [rolledEvent] = await events(g.m, g.gameId, 2).then((list) =>
      list.filter(
        (e): e is Extract<GameEvent, { kind: 'combat.initiative' }> =>
          e.kind === 'combat.initiative',
      ),
    );
    expect(rolledEvent.intent).toEqual({
      combatantId: goblinId,
      mode: 'disadvantage',
    });
  });

  it('доступ: аноним, чужой, игрок, вне встречи, закрытая сцена; неверные тела', async () => {
    const g = await started('gcb_access');
    await t.anonymous().get(g.url).expect(401);
    const stranger = await user('gcb_access_stranger');
    await stranger.agent.get(g.url).expect(403);
    await g.p
      .post(`${g.url}/start`)
      .send({ participants: [g.figure] })
      .expect(403);
    await g.m.post(`${g.url}/start`).send({ participants: [] }).expect(400);
    await g.m
      .post(`${g.url}/start`)
      .send({ participants: [{ kind: 'dragon' }] })
      .expect(400);
    await g.m
      .post(`${g.url}/start`)
      .send({ participants: [g.figure, g.figure] })
      .expect(400);
    await g.m
      .post(`${g.url}/start`)
      .send({ participants: [{ kind: 'figure', characterId: g.mapId }] })
      .expect(404);
    await g.m
      .post(`${g.url}/turn/end`)
      .send({ combatantId: g.mapId })
      .expect(409);

    const combat = (await g.start([g.figure, g.goblin])).body as GameCombat;
    const own = g.idOf(combat, g.figure);
    await g.setInitiative(own, 100, 400);
    await g.p
      .put(`${g.url}/combatants/${own}/initiative`)
      .send({ initiative: 10 })
      .expect(403);
    await g.endTurn(g.p, own, 409);

    // Вне встречи игрок только смотрит; закрытую сцену не видит.
    await g.m.delete(`/api/games/${g.gameId}/session`).expect(200);
    await g.read(g.p);
    await g.p.post(`${g.url}/combatants/${own}/initiative`).expect(403);
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    await g.p.get(g.url).expect(403);
  });
});
