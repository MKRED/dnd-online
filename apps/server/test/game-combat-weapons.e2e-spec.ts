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
  Character,
  GameCombat,
  GameCombatAttack,
  GameCombatant,
  GameEventPage,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { d20, dice } from './support/combat-dice.js';
import { attackScene, goblinRef, message } from './support/combat-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

vi.mock('node:crypto', async (original) =>
  (await import('./support/combat-dice.js')).withDice(await original()),
);

// Оружие героя в бою (docs/plan/combat.md, «Решения к этапу 5»): наборы «Ближний | Дальний»
// раз за ход, смена в руке — первая бесплатно, дальше действие, вторая рука с Лёгким —
// бонусным действием после атаки основной.
describe('game combat weapons (e2e)', () => {
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

  const dagger = (name: string, slot: string) => ({
    name,
    over: {
      weaponCategory: 'simple',
      damage: { count: 1, die: 4, type: 'piercing' },
      properties: ['finesse', 'light'],
    },
    slot,
  });
  const bow = {
    name: 'Длинный лук',
    over: {
      attackType: 'ranged',
      damage: { count: 1, die: 8, type: 'piercing' },
      properties: ['heavy', 'twoHanded'],
      ammunition: { normal: 150, long: 600, kind: 'arrow' },
    },
    slot: 'rangedMain',
  };

  const scene = (prefix: string) =>
    attackScene(user, png, prefix, {
      weapons: [
        dagger('Кинжал', 'meleeMain'),
        dagger('Кинжал 2', 'meleeOff'),
        bow,
      ],
    });

  const heroOf = (combat: GameCombat, id: string): GameCombatant =>
    combat.combatants.find((c) => c.id === id)!;

  it('набор: по умолчанию ближний; дальний — раз за ход, мастер — без счёта', async () => {
    const g = await scene('gcw_sets');
    const hero = g.at(g.hero);
    const set = (agent: request.Agent, body: object, status = 200) =>
      agent.put(`${hero}/weapon-set`).send(body).expect(status);
    let combat = (await g.p.get(g.url).expect(200)).body as GameCombat;
    expect(heroOf(combat, g.hero).attack).toMatchObject({
      weaponSet: null,
      setSwitched: false,
    });
    expect(
      message(await g.p.get(`${hero}/targets?attack=rangedMain`).expect(400)),
    ).toBe('Этой атаки нет в активном наборе оружия');
    expect(message(await set(g.p, { set: 'melee' }, 409))).toBe(
      'Этот набор уже выбран',
    );

    combat = (await set(g.p, { set: 'ranged' })).body as GameCombat;
    expect(heroOf(combat, g.hero).attack).toMatchObject({
      weaponSet: 'ranged',
      setSwitched: true,
    });
    // Лук вплотную к гоблину: помеха, и Тяжёлое при Ловкости 12 — тоже.
    const targets = (
      await g.p.get(`${hero}/targets?attack=rangedMain`).expect(200)
    ).body as AttackTarget[];
    expect(targets[0]).toMatchObject({ name: 'Гоблин', band: 'normal' });
    expect(targets[0].roll.reasons.disadvantage).toEqual([
      'Враг вплотную',
      'Тяжёлое оружие',
    ]);
    await g.p.get(`${hero}/targets?attack=meleeMain`).expect(400);
    expect(message(await set(g.p, { set: 'melee' }, 409))).toBe(
      'Набор оружия уже переключали в этот ход',
    );
    await set(g.m, { set: 'melee' });
    await set(g.p, { set: 'archery' }, 400);

    const events = (
      await g.m.get(`/api/games/${g.gameId}/events?limit=1`).expect(200)
    ).body as GameEventPage;
    expect(events.events[0]).toMatchObject({
      kind: 'combat.weapon_set',
      as: { kind: 'master' },
      result: { set: 'melee' },
    });
  });

  it('вторая рука — бонусным действием и только после атаки Лёгким основной', async () => {
    const g = await scene('gcw_light');
    const hero = g.at(g.hero);
    const attack = (key: string, status = 200) =>
      g.p
        .post(`${hero}/attack`)
        .send({ attack: key, target: goblinRef })
        .expect(status);
    expect(message(await attack('meleeOff', 409))).toBe(
      'Второй рукой — после атаки Лёгким оружием основной руки в этом ходу',
    );
    dice.queue = [d20(1), d20(1)];
    await attack('meleeMain');
    const off = (await attack('meleeOff')).body as GameCombatAttack;
    expect(heroOf(off.combat, g.hero).resources).toMatchObject({
      actions: { used: 1 },
      bonusActions: { used: 1 },
    });
    expect(heroOf(off.combat, g.hero).attack!.lightAttacked).toBe(true);
  });

  it('смена в руке: первая бесплатно, вторая — действие, дальше нельзя; не в свой ход — нельзя', async () => {
    const g = await scene('gcw_swap');
    const url = `/api/games/${g.gameId}/characters/${g.character}/equipment`;
    const used = async () => {
      const combat = (await g.p.get(g.url).expect(200)).body as GameCombat;
      const own = heroOf(combat, g.hero);
      return [own.resources!.actions.used, own.attack!.handSwapped];
    };
    await g.p.delete(`${url}/meleeOff`).expect(200);
    expect(await used()).toEqual([0, true]);
    await g.p.delete(`${url}/meleeMain`).expect(200);
    expect(await used()).toEqual([1, true]);
    const res = await g.p
      .put(`${url}/meleeMain`)
      .send({ entryId: g.rows['Кинжал'] })
      .expect(409);
    expect(message(res)).toBe(
      'Действий больше нет: вторая смена оружия за ход и щит стоят действие',
    );
    // Мастер правит куклу без траты; запись журнала — с ценой смены.
    const sheet = (
      await g.m
        .put(`${url}/meleeMain`)
        .send({ entryId: g.rows['Кинжал'] })
        .expect(200)
    ).body as Character;
    expect(sheet.inventory.some((e) => e.equipped.includes('meleeMain'))).toBe(
      true,
    );
    const events = (
      await g.m.get(`/api/games/${g.gameId}/events?limit=3`).expect(200)
    ).body as GameEventPage;
    expect(events.events.map((e) => e.result)).toMatchObject([
      { spent: null },
      { spent: 'action' },
      { spent: 'free' },
    ]);

    await g.p
      .post(`${g.url}/turn/end`)
      .send({ combatantId: g.hero })
      .expect(200);
    expect(message(await g.p.delete(`${url}/meleeMain`).expect(409))).toBe(
      'В бою оружие и щит в руках меняют только в свой ход',
    );
  });
});
