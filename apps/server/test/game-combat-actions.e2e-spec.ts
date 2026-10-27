import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type {
  CombatantResources,
  GameCombat,
  GameEventPage,
  GameFigures,
  GameScenes,
} from 'shared';
import { characterBody, pngImage } from './support/character-fixture.js';
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

// Ресурсы хода в бою с очерёдностью (docs/plan/combat.md, этап 4): действия, бонусные и
// реакции из «За ход», «Рывок», «Отход» и «Уклонение» тратят действие в свой ход, начало
// своего хода всё обновляет, мастер правит потраченное.
describe('game combat actions (e2e)', () => {
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

  // Сцена фикстуры (scene-fixture.ts): у героя игрока 2 бонусных за ход, у НПС-трактирщика
  // 2 действия — до копии в библиотеку. Бой: герой (20), гоблин (10), трактирщик (5);
  // ход у героя.
  // spellSlots — ячейки героя; prepare — что сделать с листами до копии в библиотеку.
  async function fighting(
    prefix: string,
    prepare?: (g: Awaited<ReturnType<typeof createSceneGame>>) => Promise<void>,
  ) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const p = g.player.agent;
    await p
      .put(`/api/characters/${g.character}`)
      .send(
        characterBody({
          name: 'Зритель',
          bonusActionCount: 2,
          spellSlots: {
            '1': { total: 1, expended: 0 },
            '2': { total: 2, expended: 0 },
          },
        }),
      )
      .expect(200);
    await m
      .put(`/api/characters/${g.npc}`)
      .send(characterBody({ kind: 'npc', name: 'Трактирщик', actionCount: 2 }))
      .expect(200);
    await prepare?.(g);
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
    const started = (
      await m
        .post(`${url}/start`)
        .send({
          participants: [
            { kind: 'figure', characterId: g.character },
            { kind: 'creature', objectId: 2 },
            { kind: 'creature', objectId: 3 },
          ],
        })
        .expect(200)
    ).body as GameCombat;
    const [hero, goblin, npc] = started.combatants.map((c) => c.id);
    for (const [id, initiative] of [
      [hero, 20],
      [goblin, 10],
      [npc, 5],
    ] as const) {
      await m
        .put(`${url}/combatants/${id}/initiative`)
        .send({ initiative })
        .expect(200);
    }
    const read = async (agent: request.Agent) =>
      (await agent.get(url).expect(200)).body as GameCombat;
    const act = (
      agent: request.Agent,
      id: string,
      action: string,
      status = 200,
    ) =>
      agent
        .post(`${url}/combatants/${id}/actions`)
        .send({ action })
        .expect(status);
    const setUsed = (
      agent: request.Agent,
      id: string,
      body: object,
      status = 200,
    ) =>
      agent.put(`${url}/combatants/${id}/resources`).send(body).expect(status);
    const use = (
      agent: request.Agent,
      id: string,
      body: object,
      status = 200,
    ) =>
      agent.post(`${url}/combatants/${id}/abilities`).send(body).expect(status);
    const endTurn = (agent: request.Agent, combatantId: string) =>
      agent.post(`${url}/turn/end`).send({ combatantId }).expect(200);
    return {
      ...g,
      m,
      p,
      url,
      hero,
      goblin,
      npc,
      read,
      act,
      setUsed,
      use,
      endTurn,
    };
  }

  const entry = (combat: GameCombat, id: string) =>
    combat.combatants.find((c) => c.id === id)!;
  const resources = (combat: GameCombat, id: string) =>
    entry(combat, id).resources;

  const message = (res: request.Response) =>
    (res.body as { message: string }).message;

  const fresh = (counts: [number, number, number]): CombatantResources => ({
    actions: { max: counts[0], used: 0 },
    bonusActions: { max: counts[1], used: 0 },
    reactions: { max: counts[2], used: 0 },
  });

  it('«Рывок» тратит действие и добавляет запас; ход у следующего — всё снова целое', async () => {
    const g = await fighting('gca_flow');
    let combat = await g.read(g.p);
    expect(combat.turn).toBe(g.hero);
    // Игрок видит ресурсы своего героя, но не монстров; мастер — всех.
    expect(resources(combat, g.hero)).toEqual(fresh([1, 2, 1]));
    expect(resources(combat, g.goblin)).toBeNull();
    combat = await g.read(g.m);
    expect(resources(combat, g.goblin)).toEqual(fresh([1, 1, 1]));
    expect(resources(combat, g.npc)).toEqual(fresh([2, 1, 1]));

    combat = (await g.act(g.p, g.hero, 'dash')).body as GameCombat;
    expect(resources(combat, g.hero)!.actions).toEqual({ max: 1, used: 1 });
    const figures = (
      await g.p.get(`/api/games/${g.gameId}/scene/figures`).expect(200)
    ).body as GameFigures;
    expect(figures.figures[0]).toMatchObject({ dashes: 1 });
    expect(message(await g.act(g.p, g.hero, 'dodge', 409))).toBe(
      'В этом ходу действий больше нет',
    );

    // Запись журнала про героя видна партии.
    const page = (
      await g.m.get(`/api/games/${g.gameId}/events?limit=1`).expect(200)
    ).body as GameEventPage;
    expect(page.events[0]).toMatchObject({
      kind: 'combat.action',
      visibility: 'players',
      as: { kind: 'character', id: g.character },
      result: { action: 'dash', dashes: 1 },
    });

    // Ход гоблина: мастер уклоняется за него. У героя ресурсы до его хода не обновляются.
    await g.endTurn(g.p, g.hero);
    combat = (await g.act(g.m, g.goblin, 'dodge')).body as GameCombat;
    expect(resources(combat, g.goblin)!.actions.used).toBe(1);
    expect(entry(combat, g.goblin).dodging).toBe(true);
    // «Уклонение» гоблина видит и игрок, хотя ресурсов гоблина ему не видно.
    expect(entry(await g.read(g.p), g.goblin)).toMatchObject({
      resources: null,
      dodging: true,
    });
    expect(resources(combat, g.hero)!.actions.used).toBe(1);

    // Трактирщик с двумя действиями: «Отход», потом «Рывок»; «Отход» снимается с концом хода.
    await g.endTurn(g.m, g.goblin);
    await g.act(g.m, g.npc, 'disengage');
    combat = (await g.act(g.m, g.npc, 'dash')).body as GameCombat;
    expect(resources(combat, g.npc)!.actions).toEqual({ max: 2, used: 2 });
    expect(entry(combat, g.npc).disengaged).toBe(true);

    // Новый раунд, ход героя: его ресурсы целые, «Уклонение» гоблина ещё держится,
    // «Отход» трактирщика кончился. Запас героя снова без «Рывков».
    combat = (await g.endTurn(g.m, g.npc)).body as GameCombat;
    expect(combat.round).toBe(2);
    expect(resources(combat, g.hero)).toEqual(fresh([1, 2, 1]));
    expect(entry(combat, g.goblin).dodging).toBe(true);
    expect(entry(combat, g.npc).disengaged).toBe(false);
    const after = (
      await g.p.get(`/api/games/${g.gameId}/scene/figures`).expect(200)
    ).body as GameFigures;
    expect(after.figures[0]).toMatchObject({ dashes: 0 });

    // Ход гоблина снова — его «Уклонение» кончилось.
    await g.endTurn(g.p, g.hero);
    combat = await g.read(g.m);
    expect(resources(combat, g.goblin)).toEqual(fresh([1, 1, 1]));
    expect(entry(combat, g.goblin).dodging).toBe(false);
  });

  it('мастер правит потраченное; уклоняться дважды нельзя', async () => {
    const g = await fighting('gca_fix');
    await g.endTurn(g.p, g.hero);
    await g.act(g.m, g.goblin, 'dodge');
    let combat = (await g.setUsed(g.m, g.goblin, { actionsUsed: 0 }))
      .body as GameCombat;
    expect(resources(combat, g.goblin)!.actions.used).toBe(0);
    expect(message(await g.act(g.m, g.goblin, 'dodge', 409))).toBe(
      'Участник уже уклоняется',
    );
    combat = (
      await g.setUsed(g.m, g.hero, { bonusActionsUsed: 2, reactionsUsed: 1 })
    ).body as GameCombat;
    expect(resources(combat, g.hero)).toMatchObject({
      actions: { used: 0 },
      bonusActions: { used: 2 },
      reactions: { used: 1 },
    });
    const page = (
      await g.m.get(`/api/games/${g.gameId}/events?limit=1`).expect(200)
    ).body as GameEventPage;
    expect(page.events[0]).toMatchObject({
      kind: 'combat.resources',
      result: {
        before: { bonusActionsUsed: 0, reactionsUsed: 0 },
        after: { bonusActionsUsed: 2, reactionsUsed: 1 },
      },
    });
    // Больше, чем есть за ход, — нельзя.
    expect(
      message(await g.setUsed(g.m, g.hero, { bonusActionsUsed: 3 }, 400)),
    ).toBe('Потратить можно не больше, чем есть за ход');
    await g.setUsed(g.m, g.hero, { actionsUsed: -1 }, 400);
    await g.setUsed(g.m, g.hero, { actionsUsed: 1.5 }, 400);
  });

  it('доступ: только в свой ход, только своего, правка — только мастеру', async () => {
    const g = await fighting('gca_access');
    const stranger = await user('gca_access_stranger');
    await t
      .anonymous()
      .post(`${g.url}/combatants/${g.hero}/actions`)
      .send({ action: 'dash' })
      .expect(401);
    await g.act(stranger.agent, g.hero, 'dash', 403);
    // Игрок не действует за монстра и не правит потраченное.
    expect(message(await g.act(g.p, g.goblin, 'dash', 403))).toBe(
      'Действовать за участника может тот, кто водит фигурку, или мастер',
    );
    await g.setUsed(g.p, g.hero, { actionsUsed: 0 }, 403);
    // Не в свой ход — нельзя ни игроку, ни мастеру за монстра.
    expect(message(await g.act(g.m, g.goblin, 'dodge', 409))).toBe(
      'Сейчас не ваш ход',
    );
    await g.endTurn(g.p, g.hero);
    await g.act(g.p, g.hero, 'dash', 409);
    // Неизвестное действие и неизвестный участник.
    await g.act(g.m, g.goblin, 'help', 400);
    await g.act(g.m, '00000000-0000-4000-8000-000000000000', 'dash', 404);
  });

  const idOf = (res: request.Response) => (res.body as { id: string }).id;
  const noCosts = {
    uses: null,
    spellSlot: null,
    movement: null,
    hitDie: false,
  };
  const ability = (name: string, level: number | null, activation: object) => ({
    name,
    category: level === null ? 'basic' : 'spell',
    details:
      level === null
        ? {}
        : {
            level,
            school: 'evocation',
            components: 'В, С',
            ritual: false,
            duration: { kind: 'instant' },
          },
    description: '',
    isPublic: false,
    activation,
    costs: level ? { ...noCosts, spellSlot: { minLevel: level } } : noCosts,
  });

  // Герою: «Целительное слово» (1 круг, бонусное), «Щит» (1 круг, реакция), оба
  // подготовлены; «Огненный шар» (3 круг) не подготовлен; «Ритуал» на 10 минут. НПС —
  // заговор действием.
  async function withAbilities(prefix: string) {
    // entries — строки героя; у НПС строка в копии библиотеки зовётся id способности
    // каталога (catalog).
    const entries: Record<string, string> = {};
    const catalog: Record<string, string> = {};
    const g = await fighting(prefix, async (s) => {
      const m = s.master.agent;
      const p = s.player.agent;
      const add = async (
        agent: request.Agent,
        characterId: string,
        key: string,
        body: object,
        prepared: boolean,
      ) => {
        const abilityId = idOf(
          await agent.post('/api/abilities').send(body).expect(201),
        );
        const url = `/api/characters/${characterId}/abilities`;
        catalog[key] = abilityId;
        const added = await agent.post(url).send({ abilityId }).expect(201);
        entries[key] = (
          added.body as { id: string; ability: { id: string } | null }[]
        ).find((row) => row.ability?.id === abilityId)!.id;
        if (prepared) {
          await agent
            .patch(`${url}/${entries[key]}`)
            .send({ prepared: true })
            .expect(200);
        }
      };
      const hero = s.character;
      await add(
        p,
        hero,
        'word',
        ability('Целительное слово', 1, { kind: 'bonus_action' }),
        true,
      );
      await add(
        p,
        hero,
        'shield',
        ability('Щит', 1, { kind: 'reaction', trigger: '' }),
        true,
      );
      await add(
        p,
        hero,
        'fireball',
        ability('Огненный шар', 3, { kind: 'action' }),
        false,
      );
      await add(
        p,
        hero,
        'ritual',
        ability('Ритуал', null, { kind: 'time', amount: 10, unit: 'minute' }),
        false,
      );
      await add(
        m,
        s.npc,
        'bolt',
        ability('Огненный снаряд', 0, { kind: 'action' }),
        false,
      );
    });
    return { ...g, entries, catalog };
  }

  async function heroSlots(g: { p: request.Agent; character: string }) {
    const res = await g.p.get(`/api/characters/${g.character}`).expect(200);
    return (res.body as { spellSlots: Record<string, { expended: number }> })
      .spellSlots;
  }

  it('«Применить» тратит действие нужного вида и ячейку выбранного круга', async () => {
    const g = await withAbilities('gca_use');
    const word = { abilityId: g.entries.word };
    let combat = (await g.use(g.p, g.hero, { ...word, slotLevel: 1 }))
      .body as GameCombat;
    expect(resources(combat, g.hero)!.bonusActions.used).toBe(1);
    expect((await heroSlots(g))['1'].expended).toBe(1);
    const events = (
      await g.m.get(`/api/games/${g.gameId}/events?limit=2`).expect(200)
    ).body as GameEventPage;
    expect(events.events.map((e) => e.kind)).toEqual([
      'character.changed',
      'combat.ability',
    ]);
    expect(events.events[1]).toMatchObject({
      visibility: 'players',
      result: {
        ability: { name: 'Целительное слово' },
        spent: 'bonus_action',
        slotLevel: 1,
      },
    });

    // Ячеек 1 круга больше нет, без круга нельзя; 2 круг — можно, пока есть бонусные.
    expect(
      message(await g.use(g.p, g.hero, { ...word, slotLevel: 1 }, 409)),
    ).toBe('Свободных ячеек 1 круга нет');
    expect(message(await g.use(g.p, g.hero, word, 400))).toBe(
      'Выберите круг ячейки — не ниже 1',
    );
    await g.use(g.p, g.hero, { ...word, slotLevel: 2 });
    expect(
      message(await g.use(g.p, g.hero, { ...word, slotLevel: 2 }, 409)),
    ).toBe('Бонусное действие уже потрачено');
    expect(
      message(
        await g.use(
          g.p,
          g.hero,
          { abilityId: g.entries.fireball, slotLevel: 3 },
          409,
        ),
      ),
    ).toBe('Заклинание не подготовлено');
    await g.use(g.p, g.hero, { abilityId: g.entries.ritual }, 409);

    // Ход гоблина: реакция героя — можно, бонусное — нет.
    await g.endTurn(g.p, g.hero);
    expect(
      message(await g.use(g.p, g.hero, { ...word, slotLevel: 2 }, 409)),
    ).toBe('Сейчас не ваш ход');
    const shield = { abilityId: g.entries.shield, slotLevel: 2 };
    combat = (await g.use(g.p, g.hero, shield)).body as GameCombat;
    expect(resources(combat, g.hero)!.reactions.used).toBe(1);
    expect((await heroSlots(g))['2'].expended).toBe(2);
    expect(message(await g.use(g.p, g.hero, shield, 409))).toBe(
      'Реакция уже потрачена',
    );

    // Ход НПС: заговор из его копии в библиотеке тратит действие без ячейки.
    await g.endTurn(g.m, g.goblin);
    combat = (await g.use(g.m, g.npc, { abilityId: g.catalog.bolt }))
      .body as GameCombat;
    expect(resources(combat, g.npc)!.actions.used).toBe(1);
  });

  it('«Применить»: только своё и только то, что есть у участника', async () => {
    const g = await withAbilities('gca_use_access');
    await t
      .anonymous()
      .post(`${g.url}/combatants/${g.hero}/abilities`)
      .send({ abilityId: g.entries.word, slotLevel: 1 })
      .expect(401);
    await g.use(g.p, g.npc, { abilityId: g.catalog.bolt }, 403);
    expect(
      message(await g.use(g.p, g.hero, { abilityId: g.catalog.bolt }, 404)),
    ).toBe('У участника нет такой способности');
    await g.use(g.p, g.hero, { abilityId: g.entries.word, slotLevel: 0 }, 400);
    await g.use(g.p, g.hero, {}, 400);
  });
});
