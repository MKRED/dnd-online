import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { GameEventPage, GameScenes } from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame, fogOff } from './support/scene-fixture.js';
import {
  listenForSockets,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Журнал после первой партии (2026-10-26): урон по частям с типами и кому видна запись.
// Видимость решается при записи: хиты существа игроки видят, только если видели его.
describe('game event visibility and damage parts (e2e)', () => {
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

  // Сцена из карты фикстуры: объект 2 — гоблин (4 хита), 3 — НПС «Трактирщик» (12).
  // Сцена активная, закрыта, с туманом войны.
  async function started(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const res = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (res.body as GameScenes).scenes[0].id;
    const url = `/api/games/${g.gameId}/scene/creatures`;
    const change = (
      objectId: number,
      body: Record<string, unknown>,
      status = 200,
    ) => m.post(`${url}/${objectId}/changes`).send(body).expect(status);
    const last = async () => {
      const page = await m
        .get(`/api/games/${g.gameId}/events?limit=1`)
        .expect(200);
      return (page.body as GameEventPage).events[0];
    };
    const open = () =>
      m
        .put(`/api/games/${g.gameId}/scenes/open`)
        .send({ open: true })
        .expect(200);
    return { ...g, m, sceneId, change, last, open };
  }

  it('урон по частям: в журнале части и сумма, хиты — по сумме; числом — одна часть без типа', async () => {
    const g = await started('gev_parts');
    await g.change(3, {
      kind: 'damage',
      parts: [
        { amount: 6, type: 'piercing' },
        { amount: 4, type: 'necrotic' },
      ],
    });
    expect(await g.last()).toMatchObject({
      kind: 'creature.changed',
      intent: {
        objectId: 3,
        change: {
          kind: 'damage',
          amount: 10,
          parts: [
            { amount: 6, type: 'piercing' },
            { amount: 4, type: 'necrotic' },
          ],
        },
      },
      result: { before: { current: 12 }, after: { current: 2 } },
    });
    // Тип у части необязателен.
    await g.change(3, { kind: 'heal', amount: 10 });
    await g.change(3, { kind: 'damage', parts: [{ amount: 3 }] });
    expect((await g.last()).intent).toMatchObject({
      change: { amount: 3, parts: [{ amount: 3, type: null }] },
    });
    await g.change(3, { kind: 'damage', amount: 2 });
    expect((await g.last()).intent).toMatchObject({
      change: { amount: 2, parts: [{ amount: 2, type: null }] },
    });
  });

  it('неверные части урона — 400', async () => {
    const g = await started('gev_bad');
    const part = { amount: 1, type: 'fire' };
    await g.change(2, { kind: 'damage', parts: [] }, 400);
    await g.change(2, { kind: 'damage', parts: Array(6).fill(part) }, 400);
    await g.change(
      2,
      { kind: 'damage', parts: [{ amount: 1, type: 'love' }] },
      400,
    );
    await g.change(
      2,
      { kind: 'damage', parts: [{ amount: -1, type: 'fire' }] },
      400,
    );
    await g.change(
      2,
      {
        kind: 'damage',
        parts: [
          { amount: 9000, type: 'fire' },
          { amount: 1000, type: 'cold' },
        ],
      },
      400,
    );
    // Лечению части не нужны — нужно число.
    await g.change(2, { kind: 'heal', parts: [part] }, 400);
  });

  it('хиты существа видны игрокам, только если они его видели', async () => {
    const g = await started('gev_seen');
    // Сцена закрыта от игроков.
    await g.change(2, { kind: 'damage', amount: 1 });
    expect((await g.last()).visibility).toBe('master');
    // Открыта, под туманом: фигурка игрока стоит рядом с гоблином и видит его.
    await g.open();
    expect((await g.last()).visibility).toBe('players');
    await g.change(2, { kind: 'damage', amount: 1 });
    expect((await g.last()).visibility).toBe('players');
    // Игрок ушёл с места — смотреть некому.
    await g.player.agent.delete(`/api/games/${g.gameId}/seats/me`).expect(200);
    await g.change(2, { kind: 'heal', amount: 1 });
    expect((await g.last()).visibility).toBe('master');
    // Без тумана — видно.
    await fogOff(g.m, g.gameId, g.sceneId);
    expect((await g.last()).visibility).toBe('master');
    await g.change(2, { kind: 'heal', amount: 1 });
    expect((await g.last()).visibility).toBe('players');
    // Скрытый мастером — нет; правка сцены сама по себе — только мастеру.
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/ops`)
      .send({ ops: [{ op: 'updateObject', id: 2, object: { hidden: true } }] })
      .expect(200);
    expect(await g.last()).toMatchObject({
      kind: 'scene.edited',
      visibility: 'master',
    });
    await g.change(2, { kind: 'heal', amount: 1 });
    expect((await g.last()).visibility).toBe('master');
  });
});
