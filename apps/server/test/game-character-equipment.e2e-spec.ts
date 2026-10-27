import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EQUIP_COMBAT_ARMOR,
  EQUIP_COMBAT_ATTUNE,
  type Character,
  type GameEventPage,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import {
  createArmor,
  createRing,
  createShield,
} from './support/equipment-fixture.js';
import type { CreatedItem } from './support/item-fixture.js';
import { createSceneGame, startSession } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Кукла персонажа во время встречи (docs/plan/equipment.md, этап 4): правят мастер, владелец
// и управляющий, как фигурку; в бою доспех и настройку не сменить; правка — в журнал.
describe('game character equipment (e2e)', () => {
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

  // У игрока в инвентаре латы, щит и кольцо с настройкой; сцена активна, встреча идёт.
  async function setup(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const p = g.player.agent;
    const rows: Record<string, string> = {};
    const add = async (item: CreatedItem) => {
      const res = await p
        .post(`/api/characters/${g.character}/items`)
        .send({ itemId: item.id, quantity: 1, location: 'carried' })
        .expect(201);
      rows[item.name] = (res.body as { id: string }[]).at(-1)!.id;
    };
    await add(await createArmor(p, 'Латы', null));
    await add(await createShield(p));
    await add(await createRing(p, 'Кольцо защиты', true));
    await g.master.agent
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    await startSession(g.master.agent, g.gameId);
    const url = `/api/games/${g.gameId}/characters/${g.character}`;
    const mode = (m: 'free' | 'tactical') =>
      g.master.agent
        .put(`/api/games/${g.gameId}/figures/mode`)
        .send({ mode: m })
        .expect(200);
    return { ...g, rows, url, mode };
  }

  const worn = (res: request.Response): Record<string, unknown> =>
    Object.fromEntries(
      (res.body as Character).inventory
        .filter((e) => e.equipped.length > 0 || e.attuned)
        .map((e): [string, unknown] => [
          e.item?.name ?? '',
          [e.equipped, e.attuned],
        ]),
    );

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  it('игрок надевает и настраивается, мастер снимает; лист целиком, запись видна игрокам', async () => {
    const g = await setup('ge_happy');
    const p = g.player.agent;
    await p
      .put(`${g.url}/equipment/body`)
      .send({ entryId: g.rows['Латы'] })
      .expect(200);
    const shielded = await p
      .put(`${g.url}/equipment/meleeOff`)
      .send({ entryId: g.rows['Щит'] })
      .expect(200);
    expect(worn(shielded)).toEqual({
      Латы: [['body'], false],
      Щит: [['meleeOff'], false],
    });
    const event = await lastEvent(g.master.agent, g.gameId);
    expect(event).toMatchObject({
      kind: 'character.equipment',
      visibility: 'players',
      as: { kind: 'character', id: g.character },
      intent: {
        change: { kind: 'equip', slot: 'meleeOff', entryId: g.rows['Щит'] },
      },
      result: { character: { name: 'Зритель' }, item: { name: 'Щит' } },
    });

    await p
      .put(`${g.url}/items/${g.rows['Кольцо защиты']}/attunement`)
      .expect(200);
    const off = await g.master.agent
      .delete(`${g.url}/equipment/body`)
      .expect(200);
    expect(worn(off)).toEqual({
      Щит: [['meleeOff'], false],
      'Кольцо защиты': [[], true],
    });
    expect(await lastEvent(g.master.agent, g.gameId)).toMatchObject({
      as: { kind: 'master' },
      intent: { change: { kind: 'unequip', slot: 'body' } },
      result: { item: { name: 'Латы' } },
    });
    // Лист владельца — тот же: правка из игры остаётся после встречи.
    const sheet = await p.get(`/api/characters/${g.character}`).expect(200);
    expect(worn(sheet)).toEqual(worn(off));
  });

  it('в бою: доспех и настройку нельзя, щит можно; свободный режим — снова можно', async () => {
    const g = await setup('ge_combat');
    const p = g.player.agent;
    await p
      .put(`${g.url}/equipment/body`)
      .send({ entryId: g.rows['Латы'] })
      .expect(200);
    await g.mode('tactical');
    const message = (res: request.Response) =>
      (res.body as { message: string }).message;
    expect(message(await p.delete(`${g.url}/equipment/body`).expect(409))).toBe(
      EQUIP_COMBAT_ARMOR,
    );
    // Мастер тоже: книга, а не права.
    await g.master.agent.delete(`${g.url}/equipment/body`).expect(409);
    expect(
      message(
        await p
          .put(`${g.url}/items/${g.rows['Кольцо защиты']}/attunement`)
          .expect(409),
      ),
    ).toBe(EQUIP_COMBAT_ATTUNE);
    await p
      .put(`${g.url}/equipment/meleeOff`)
      .send({ entryId: g.rows['Щит'] })
      .expect(200);

    await g.mode('free');
    await p.delete(`${g.url}/equipment/body`).expect(200);
  });

  it('доступ: аноним 401, чужой 403, вне встречи игрок 403, мастер — можно', async () => {
    const g = await setup('ge_access');
    const body = { entryId: g.rows['Щит'] };
    await t
      .anonymous()
      .put(`${g.url}/equipment/meleeOff`)
      .send(body)
      .expect(401);
    const stranger = await user('ge_access_stranger');
    await stranger.agent
      .put(`${g.url}/equipment/meleeOff`)
      .send(body)
      .expect(403);
    await g.master.agent.delete(`/api/games/${g.gameId}/session`).expect(200);
    await g.player.agent
      .put(`${g.url}/equipment/meleeOff`)
      .send(body)
      .expect(403);
    await g.master.agent
      .put(`${g.url}/equipment/meleeOff`)
      .send(body)
      .expect(200);
  });

  it('неверное: место, вещь не на то место, чужая строка, не uuid — 400 и 404', async () => {
    const g = await setup('ge_invalid');
    const p = g.player.agent;
    await p
      .put(`${g.url}/equipment/tail`)
      .send({ entryId: g.rows['Щит'] })
      .expect(400);
    await p
      .put(`${g.url}/equipment/body`)
      .send({ entryId: g.rows['Кольцо защиты'] })
      .expect(400);
    await p
      .put(`${g.url}/equipment/body`)
      .send({ entryId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
    await p.put(`${g.url}/equipment/body`).send({ entryId: 'x' }).expect(400);
  });
});
