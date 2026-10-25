import type request from 'supertest';
import { characterBody, PNG_FILE } from './character-fixture.js';
import { createItem } from './item-fixture.js';
import { monsterBody } from './monster-fixture.js';

// Игра со сценой для e2e сцен (docs/plan/done/game.md, этапы 5 и 6).

// Как входит пользователь: у сокетных тестов — ещё и с cookie (socket-client.ts).
export type SceneUser<U> = (login: string) => Promise<U>;

const idOf = (res: request.Response) => (res.body as { id: string }).id;

// Мастер с картой (блоки, старт, монстр, НПС с картинкой и предметом, бочка с
// самоцветом, верёвка на полу), игра и игрок на месте.
export async function createSceneGame<
  U extends { agent: request.Agent; id: string },
>(user: SceneUser<U>, png: Buffer, prefix: string) {
  const master = await user(`${prefix}_master`);
  const m = master.agent;
  const map = await m
    .post('/api/maps')
    .send({ name: 'Логово', width: 8, depth: 8 })
    .expect(201);
  const mapId = idOf(map);
  const goblin = idOf(
    await m
      .post('/api/monsters')
      .send({ ...monsterBody(), name: 'Гоблин', role: 'regular' })
      .expect(201),
  );
  const rope = await createItem(m, { name: 'Верёвка' });
  await m
    .put(`/api/items/${rope.id}/image`)
    .attach('file', png, PNG_FILE)
    .expect(200);
  const gem = await createItem(m, { name: 'Самоцвет' });
  await m
    .put(`/api/items/${gem.id}/image`)
    .attach('file', png, PNG_FILE)
    .expect(200);
  const npc = idOf(
    await m
      .post('/api/characters')
      .send(characterBody({ kind: 'npc', name: 'Трактирщик' }))
      .expect(201),
  );
  await m
    .post(`/api/characters/${npc}/images`)
    .attach('file', png, PNG_FILE)
    .expect(201);
  await m
    .post(`/api/characters/${npc}/items`)
    .send({ itemId: gem.id, quantity: 1, location: 'carried' })
    .expect(201);
  await m
    .post(`/api/maps/${mapId}/ops`)
    .send({
      ops: [
        { op: 'fillBox', from: [0, 0, 0], to: [7, 0, 7], block: 'stone' },
        { op: 'placeObject', at: [0, 1, 0], object: { kind: 'start' } },
        {
          op: 'placeObject',
          at: [1, 1, 0],
          object: { kind: 'monster', monsterId: goblin },
        },
        {
          op: 'placeObject',
          at: [2, 1, 0],
          object: { kind: 'npc', characterId: npc },
        },
        {
          op: 'placeObject',
          at: [3, 1, 0],
          object: {
            kind: 'container',
            look: 'barrel',
            items: [{ itemId: gem.id, quantity: 2 }],
          },
        },
        {
          op: 'placeObject',
          at: [4, 1, 0],
          object: { kind: 'item', itemId: rope.id },
        },
      ],
    })
    .expect(200);

  const gameId = idOf(
    await m
      .post('/api/games')
      .send({ name: 'Сценическая', seatCount: 2 })
      .expect(201),
  );
  const player = await user(`${prefix}_player`);
  const character = idOf(
    await player.agent
      .post('/api/characters')
      .send(characterBody({ name: 'Зритель' }))
      .expect(201),
  );
  await player.agent
    .post(`/api/games/${gameId}/seats`)
    .send({ characterId: character })
    .expect(201);
  return { master, player, character, mapId, gameId, goblin, npc, rope, gem };
}

// Мастер начинает встречу: вне неё игрок на сцене только смотрит — не ходит, не тянет
// фигурку и не правит персонажа из игры.
export async function startSession(master: request.Agent, gameId: string) {
  await master.post(`/api/games/${gameId}/session`).expect(201);
}
