import type request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  AttackTarget,
  GameCombat,
  GameCombatAttack,
  GameCombatDamage,
  GameCreatures,
  GameEventPage,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { d20, dice, MAX_DIE } from './support/combat-dice.js';
import {
  attackScene,
  goblinRef,
  message,
  npcRef,
} from './support/combat-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

vi.mock('node:crypto', async (original) =>
  (await import('./support/combat-dice.js')).withDice(await original()),
);

// Атака героя (docs/plan/combat.md, этап 5): цели, бросок атаки в свой ход, урон вторым
// нажатием с критом и защитами цели, журнал. Герой: Сила 15 (+2), мастерство +2; гоблин —
// КД 10, 4 хита (стат-блок по умолчанию).
describe('game combat attacks (e2e)', () => {
  let t: TestApp;
  let png: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    png = await pngImage();
  });

  afterEach(() => {
    dice.queue = [];
  });

  afterAll(async () => {
    await t.close();
  });

  async function user(login: string) {
    const agent = await t.loginAs(login);
    const me = await agent.get('/api/auth/me').expect(200);
    return { agent, id: (me.body as { user: { id: string } }).user.id };
  }

  const sword = {
    name: 'Длинный меч',
    over: { damage: { count: 1, die: 8, type: 'slashing' } },
    slot: 'meleeMain',
  };

  const attack = (
    agent: request.Agent,
    at: string,
    body: object,
    status = 200,
  ) => agent.post(`${at}/attack`).send(body).expect(status);

  async function goblinHp(g: Awaited<ReturnType<typeof attackScene>>) {
    const res = await g.m
      .get(`/api/games/${g.gameId}/scene/creatures`)
      .expect(200);
    const goblin = (res.body as GameCreatures).creatures.find(
      (c) => c.objectId === 2,
    )!;
    return goblin.state!.hitPoints.current;
  }

  async function lastEvents(agent: request.Agent, gameId: string, limit = 3) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=${limit}`)
      .expect(200);
    return (res.body as GameEventPage).events;
  }

  it('цели: расстояние и досягаемость, КД — только мастеру; доступ', async () => {
    const g = await attackScene(user, png, 'gat_targets');
    const url = `${g.at(g.hero)}/targets?attack=unarmed`;
    const targets = (await g.p.get(url).expect(200)).body as AttackTarget[];
    expect(
      targets.map((x) => [x.name, x.distance, x.band, x.cover, x.ally]),
    ).toEqual([
      ['Гоблин', 5, 'normal', 'none', false],
      ['Трактирщик', 10, 'out', 'none', false],
    ]);
    expect(targets[0].armorClass).toBeNull();
    expect(targets[0].roll.terms).toEqual([
      { kind: 'number', label: 'Сила', amount: 2 },
      { kind: 'number', label: 'Мастерство', amount: 2 },
    ]);
    const master = (await g.m.get(url).expect(200)).body as AttackTarget[];
    expect(master[0].armorClass).toBe(10);

    await t.anonymous().get(url).expect(401);
    const outsider = await user('gat_targets_out');
    await outsider.agent.get(url).expect(403);
    await g.p.get(`${g.at(g.hero)}/targets?attack=bite`).expect(400);
    // Игрок не водит гоблина.
    await g.p.get(`${g.at(g.goblin)}/targets?attack=unarmed`).expect(403);
    // Атаки монстров — следующий этап.
    expect(
      message(
        await g.m.get(`${g.at(g.goblin)}/targets?attack=unarmed`).expect(409),
      ),
    ).toBe('Пока атакуют только герои: атаки монстров и НПС — следующий этап');
  });

  it('цель за полным укрытием — в списке, но атаковать её нельзя', async () => {
    const g = await attackScene(user, png, 'gat_total');
    // Трактирщик — в 15 фт., за стеной во всю ширину героя и выше глаз обоих.
    await g.ops([
      { op: 'moveObject', id: 3, at: [3, 1, 0] },
      { op: 'fillBox', from: [2, 1, 0], to: [2, 3, 1], block: 'stone' },
    ]);
    const url = `${g.at(g.hero)}/targets?attack=unarmed`;
    const targets = (await g.m.get(url).expect(200)).body as AttackTarget[];
    expect(targets.map((x) => [x.name, x.distance, x.cover])).toEqual([
      ['Гоблин', 5, 'none'],
      ['Трактирщик', 15, 'total'],
    ]);
    // КД за полным укрытием не считается — даже мастеру.
    expect(targets[1].armorClass).toBeNull();
    expect(
      message(
        await attack(
          g.p,
          g.at(g.hero),
          { attack: 'unarmed', target: npcRef },
          409,
        ),
      ),
    ).toBe('Цель за полным укрытием');
  });

  it('попадание, урон вторым нажатием, журнал; пока урон не брошен — ход держится', async () => {
    const g = await attackScene(user, png, 'gat_hit');
    const hero = g.at(g.hero);
    dice.queue = [d20(11)];
    const hit = (
      await attack(g.p, hero, { attack: 'unarmed', target: goblinRef })
    ).body as GameCombatAttack;
    expect(hit).toMatchObject({ outcome: 'hit', armorClass: null });
    expect(hit.roll.total).toBe(15);
    const own = hit.combat.combatants.find((c) => c.id === g.hero)!;
    expect(own.resources!.actions.used).toBe(1);
    expect(own.attack!.pending).toMatchObject({
      attack: 'unarmed',
      critical: false,
      target: { ref: goblinRef, name: 'Гоблин' },
    });

    expect(
      message(
        await g.p
          .post(`${g.url}/turn/end`)
          .send({ combatantId: g.hero })
          .expect(409),
      ),
    ).toBe('Сначала бросьте урон по прошлому попаданию');
    await attack(g.p, hero, { attack: 'unarmed', target: goblinRef }, 409);

    const damage = (await g.p.post(`${hero}/damage`).expect(200))
      .body as GameCombatDamage;
    // 1 + Сила 2, дробящий; хиты гоблина игроку не видны.
    expect(damage.damage.byType).toEqual([
      { type: 'bludgeoning', rolled: 3, dealt: 3, defenses: [] },
    ]);
    expect(damage.hitPoints).toBeNull();
    expect(await goblinHp(g)).toBe(1);
    await g.p.post(`${hero}/damage`).expect(409);

    const [changed, dealt, rolled] = await lastEvents(g.m, g.gameId);
    expect(rolled).toMatchObject({
      kind: 'combat.attack',
      visibility: 'players',
      as: { kind: 'character', id: g.character },
      result: {
        armorClass: 10,
        cover: 'none',
        outcome: 'hit',
        spent: 'action',
      },
    });
    expect(dealt).toMatchObject({
      kind: 'combat.damage',
      result: { applied: true, damage: { total: 3 } },
    });
    // Хиты сняты от имени героя, а не мастера.
    expect(changed).toMatchObject({
      kind: 'creature.changed',
      as: { kind: 'character', id: g.character },
      intent: {
        change: { amount: 3, parts: [{ amount: 3, type: 'bludgeoning' }] },
      },
      result: { after: { current: 1 } },
    });
    await g.p
      .post(`${g.url}/turn/end`)
      .send({ combatantId: g.hero })
      .expect(200);
  });

  it('крит: кости урона вдвое; сопротивление цели — половина вниз; мастер видит хиты', async () => {
    const g = await attackScene(user, png, 'gat_crit', {
      weapons: [sword],
      goblin: {
        resistances: ['slashing'],
        hitPoints: { average: 30, dice: { count: 5, die: 10, bonus: 3 } },
      },
    });
    const hero = g.at(g.hero);
    dice.queue = [d20(20)];
    const crit = (
      await attack(g.m, hero, { attack: 'meleeMain', target: goblinRef })
    ).body as GameCombatAttack;
    expect(crit).toMatchObject({ outcome: 'critical', armorClass: 10 });
    dice.queue = [MAX_DIE, MAX_DIE];
    const damage = (await g.m.post(`${hero}/damage`).expect(200))
      .body as GameCombatDamage;
    // 2к8 (8 + 8) + Сила 2 = 18 рубящего, сопротивление — 9.
    expect(damage.damage).toMatchObject({
      critical: true,
      byType: [
        { type: 'slashing', rolled: 18, dealt: 9, defenses: ['resistance'] },
      ],
      total: 9,
    });
    expect(damage.hitPoints).toEqual({ before: 30, after: 21, max: 30 });
  });

  it('промах на 1, вне досягаемости, мастерский режим броска — только мастеру', async () => {
    const g = await attackScene(user, png, 'gat_miss');
    const hero = g.at(g.hero);
    expect(
      message(
        await attack(g.p, hero, { attack: 'unarmed', target: npcRef }, 409),
      ),
    ).toBe('Цель вне досягаемости: 5 фт.');
    await attack(
      g.p,
      hero,
      { attack: 'unarmed', target: goblinRef, mode: 'advantage' },
      403,
    );
    await attack(
      g.p,
      hero,
      { attack: 'unarmed', target: { kind: 'creature', objectId: 99 } },
      404,
    );
    dice.queue = [d20(1)];
    const miss = (
      await attack(g.p, hero, { attack: 'unarmed', target: goblinRef })
    ).body as GameCombatAttack;
    expect(miss.outcome).toBe('miss');
    const own = miss.combat.combatants.find((c) => c.id === g.hero)!;
    expect(own.attack!.pending).toBeNull();
    expect(
      message(
        await attack(g.p, hero, { attack: 'unarmed', target: goblinRef }, 409),
      ),
    ).toBe('В этом ходу действий больше нет');
    // Не в свой ход — нельзя.
    await g.p
      .post(`${g.url}/turn/end`)
      .send({ combatantId: g.hero })
      .expect(200);
    const combat = (await g.p.get(g.url).expect(200)).body as GameCombat;
    expect(combat.turn).toBe(g.goblin);
    expect(
      message(
        await attack(g.p, hero, { attack: 'unarmed', target: goblinRef }, 409),
      ),
    ).toBe('Сейчас не ваш ход');
  });
});
