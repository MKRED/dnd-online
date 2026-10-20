import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  Ability,
  GameDetail,
  GameEventPage,
  GameLibraryEntry,
  GameLibraryItem,
  Item,
  Monster,
} from 'shared';
import { DatabaseService } from '../src/database/database.service.js';
import { lockGame } from '../src/games/game-journal.js';
import { copyToLibrary } from '../src/games/library/index.js';
import { fireBolt } from './abilities/steps.js';
import {
  characterBody,
  pngImage,
  PNG_FILE,
} from './support/character-fixture.js';
import { createItem, packBody } from './support/item-fixture.js';
import { createMonster } from './support/monster-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

const effectBody = (name: string, isPublic = false) => ({
  name,
  components: [{ kind: 'condition', condition: 'poisoned' }],
  description: '',
  isPublic,
  duration: { kind: 'time', amount: 1, unit: 'round', concentration: false },
  saveEnds: null,
});

// Способность, которая при попадании накладывает эффекты.
const abilityBody = (name: string, effectIds: string[], isPublic = false) => ({
  name,
  category: 'basic',
  details: {},
  description: '',
  isPublic,
  activation: { kind: 'action' },
  costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
  steps: [
    {
      ...fireBolt,
      hit: {
        ...fireBolt.hit,
        effects: effectIds.map((effectId) => ({ effectId })),
      },
    },
  ],
});

const idOf = (res: request.Response) => (res.body as { id: string }).id;

// Библиотека игры (docs/plan/game.md, этап 4): копии записей справочников, которые игра
// использует. Начало встречи копирует листы персонажей на местах; правка справочника
// копию не трогает; мастер обновляет копию сам.
describe('game library (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  async function user(login: string) {
    const agent = await t.loginAs(login);
    const me = await agent.get('/api/auth/me').expect(200);
    return { agent, id: (me.body as { user: { id: string } }).user.id };
  }

  // Мастер, игра и игрок на месте своим персонажем.
  async function seated(prefix: string) {
    const master = await user(`${prefix}_master`);
    const game = await master.agent
      .post('/api/games')
      .send({ name: 'Библиотечная', seatCount: 2 })
      .expect(201);
    const gameId = (game.body as GameDetail).id;
    const player = await user(`${prefix}_player`);
    const character = await player.agent
      .post('/api/characters')
      .send(characterBody({ name: 'Читатель' }))
      .expect(201);
    const characterId = idOf(character);
    await player.agent
      .post(`/api/games/${gameId}/seats`)
      .send({ characterId })
      .expect(201);
    return { master, player, gameId, characterId };
  }

  const libraryUrl = (gameId: string) => `/api/games/${gameId}/library`;
  const session = (gameId: string) => `/api/games/${gameId}/session`;

  async function library(agent: request.Agent, gameId: string) {
    const res = await agent.get(libraryUrl(gameId)).expect(200);
    return res.body as GameLibraryItem[];
  }

  async function entry(
    agent: request.Agent,
    gameId: string,
    kind: string,
    sourceId: string,
  ) {
    const res = await agent
      .get(`${libraryUrl(gameId)}/${kind}/${sourceId}`)
      .expect(200);
    return res.body as GameLibraryEntry;
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  it('начало встречи копирует лист со связями, глазами владельца и без повторов', async () => {
    const { master, player, gameId, characterId } = await seated('gl_copy');
    const owner = player.agent;
    const author = await user('gl_copy_author');
    const base = `/api/characters/${characterId}`;

    // Набор игрока: его скрытый предмет и чужой опубликованный.
    const ownRope = await createItem(owner, { name: 'Верёвка' });
    const lantern = await createItem(author.agent, {
      name: 'Фонарь',
      isPublic: true,
    });
    const pack = await owner
      .post('/api/items')
      .send(
        packBody([
          { itemId: ownRope.id, quantity: 1 },
          { itemId: lantern.id, quantity: 2 },
        ]),
      )
      .expect(201);
    // Чужой предмет, который автор потом скрыл: владелец его уже не видит.
    const secret = await createItem(author.agent, {
      name: 'Тайна',
      isPublic: true,
    });
    for (const itemId of [idOf(pack), secret.id])
      await owner
        .post(`${base}/items`)
        .send({ itemId, quantity: 1, location: 'carried' })
        .expect(201);
    await author.agent
      .put(`/api/items/${secret.id}`)
      .send({
        name: 'Тайна',
        category: 'basic',
        details: {},
        description: '',
        isPublic: false,
        rarity: 'none',
        weight: 1,
        cost: null,
      })
      .expect(200);

    const poison = idOf(
      await owner
        .post('/api/effects')
        .send(effectBody('Отравление'))
        .expect(201),
    );
    const sting = idOf(
      await owner
        .post('/api/abilities')
        .send(abilityBody('Жало', [poison]))
        .expect(201),
    );
    await owner
      .post(`${base}/abilities`)
      .send({ abilityId: sting })
      .expect(201);
    await owner.post(`${base}/effects`).send({ effectId: poison }).expect(201);

    await master.agent.post(session(gameId)).expect(201);
    const started = await lastEvent(master.agent, gameId);
    // Набор, его два предмета, способность и эффект (один раз, хотя он и в листе, и в шаге).
    expect(started).toMatchObject({
      kind: 'session.started',
      result: { libraryCopied: 5 },
    });
    const copies = await library(master.agent, gameId);
    expect(copies.map((c) => `${c.kind}:${c.name}`).sort()).toEqual([
      'ability:Жало',
      'effect:Отравление',
      'item:Верёвка',
      'item:Набор путешественника',
      'item:Фонарь',
    ]);
    // Свою скрытую верёвку игрок видит, мастер — нет: для него её нет в справочнике.
    expect(copies.find((c) => c.name === 'Верёвка')?.source).toBe('missing');
    expect(copies.find((c) => c.name === 'Фонарь')?.source).toBe('same');

    // Связи копии читаются из библиотеки.
    const packCopy = await entry(master.agent, gameId, 'item', idOf(pack));
    expect(
      (packCopy.record as Item & { category: 'pack' }).details.contents,
    ).toMatchObject([
      {
        itemId: ownRope.id,
        quantity: 1,
        item: { name: 'Верёвка' },
      },
      {
        itemId: lantern.id,
        quantity: 2,
        item: { name: 'Фонарь' },
      },
    ]);
    const stingCopy = (await entry(master.agent, gameId, 'ability', sting))
      .record as Ability;
    expect(stingCopy.steps[0].hit.effects).toMatchObject([
      {
        effectId: poison,
        effect: { name: 'Отравление' },
      },
    ]);

    // Новая встреча копирует только добавленное между встречами.
    await master.agent.delete(session(gameId)).expect(200);
    const torch = await createItem(owner, { name: 'Факел' });
    await owner
      .post(`${base}/items`)
      .send({ itemId: torch.id, quantity: 3, location: 'stash' })
      .expect(201);
    await master.agent.post(session(gameId)).expect(201);
    expect(await lastEvent(master.agent, gameId)).toMatchObject({
      result: { libraryCopied: 1 },
    });
    expect(await library(master.agent, gameId)).toHaveLength(6);
  });

  it('правка и удаление в справочнике копию не трогают, мастер обновляет её сам', async () => {
    const { master, player, gameId, characterId } = await seated('gl_refresh');
    const owner = player.agent;
    const base = `/api/characters/${characterId}`;
    const png = await pngImage();
    const shield = await createItem(owner, { name: 'Щит', isPublic: true });
    await owner
      .put(`/api/items/${shield.id}/image`)
      .attach('file', png, PNG_FILE)
      .expect(200);
    const boots = await createItem(owner, { name: 'Сапоги', isPublic: true });
    const pack = idOf(
      await owner
        .post('/api/items')
        .send(
          packBody([{ itemId: shield.id, quantity: 1 }], { isPublic: true }),
        )
        .expect(201),
    );
    const slow = idOf(
      await owner
        .post('/api/effects')
        .send(effectBody('Замедление', true))
        .expect(201),
    );
    await owner
      .post(`${base}/items`)
      .send({ itemId: pack, quantity: 1, location: 'carried' })
      .expect(201);
    await owner.post(`${base}/effects`).send({ effectId: slow }).expect(201);
    await master.agent.post(session(gameId)).expect(201);
    await master.agent.delete(session(gameId)).expect(200);

    // Картинка скопирована: удалили щит в справочнике — в игре она осталась.
    const shieldCopy = await entry(master.agent, gameId, 'item', shield.id);
    expect(shieldCopy.record.image).toMatchObject({ version: 1 });
    await owner
      .put(`/api/items/${pack}`)
      .send(
        packBody([{ itemId: boots.id, quantity: 2 }], {
          name: 'Новый набор',
          isPublic: true,
        }),
      )
      .expect(200);
    await owner.delete(`/api/items/${shield.id}`).expect(204);
    await owner.delete(`/api/effects/${slow}`).expect(204);
    const image = await master.agent
      .get(`${libraryUrl(gameId)}/item/${shield.id}/image?variant=thumb&v=1`)
      .expect(200);
    expect(image.headers['content-type']).toBe('image/webp');

    const copies = await library(master.agent, gameId);
    const state = (name: string) => copies.find((c) => c.name === name)?.source;
    expect(state('Набор путешественника')).toBe('changed');
    expect(state('Щит')).toBe('missing');
    expect(state('Замедление')).toBe('missing');

    // Удалённое в справочнике не обновить — копия остаётся.
    const refused = await master.agent
      .post(`${libraryUrl(gameId)}/effect/${slow}/refresh`)
      .expect(409);
    expect((refused.body as { message: string }).message).toBe(
      'Записи нет в справочнике или она скрыта от вас — обновить нельзя',
    );
    await entry(master.agent, gameId, 'effect', slow);

    // Обновление набора: новое имя и состав, сапоги докопированы, щит остался в библиотеке.
    const refreshed = await master.agent
      .post(`${libraryUrl(gameId)}/item/${pack}/refresh`)
      .expect(201);
    const packCopy = refreshed.body as GameLibraryEntry;
    expect(packCopy).toMatchObject({ name: 'Новый набор', source: 'same' });
    expect(packCopy.refreshedAt).toEqual(expect.any(String));
    expect(
      (packCopy.record as Item & { category: 'pack' }).details.contents,
    ).toMatchObject([
      {
        itemId: boots.id,
        item: { name: 'Сапоги' },
      },
    ]);
    expect(await lastEvent(master.agent, gameId)).toMatchObject({
      kind: 'library.refreshed',
      as: { kind: 'master' },
      intent: { kind: 'item', sourceId: pack },
      result: { name: 'Новый набор', copied: 1 },
    });
    expect(
      (await library(master.agent, gameId)).map((c) => c.name).sort(),
    ).toEqual(['Замедление', 'Новый набор', 'Сапоги', 'Щит']);
  });

  it('монстр копируется со способностями, снаряжением и эффектами', async () => {
    const { master, gameId } = await seated('gl_monster');
    const author = master.agent;
    const monsterId = await createMonster(author);
    const burn = idOf(
      await author.post('/api/effects').send(effectBody('Ожог')).expect(201),
    );
    const bite = idOf(
      await author
        .post('/api/abilities')
        .send(abilityBody('Укус', [burn]))
        .expect(201),
    );
    const fang = await createItem(author, { name: 'Клык' });
    const goneEffect = idOf(
      await author
        .post('/api/effects')
        .send(effectBody('Пропавший'))
        .expect(201),
    );
    const monster = `/api/monsters/${monsterId}`;
    await author
      .post(`${monster}/abilities`)
      .send({ abilityId: bite })
      .expect(201);
    await author
      .post(`${monster}/items`)
      .send({ itemId: fang.id, quantity: 2 })
      .expect(201);
    await author
      .post(`${monster}/effects`)
      .send({ effectId: goneEffect })
      .expect(201);
    // Удалённый до копии эффект — строка-заглушка у монстра.
    await author.delete(`/api/effects/${goneEffect}`).expect(204);

    // Сцены (этап 5) ещё нет — копируем так же, как будет копировать она.
    const database = t.app.get(DatabaseService);
    const copied = await database.db.transaction(async (tx) => {
      await lockGame(tx, gameId);
      return copyToLibrary(tx, gameId, master.id, [
        { kind: 'monster', sourceId: monsterId },
      ]);
    });
    expect(copied).toBe(4);
    const copy = (await entry(master.agent, gameId, 'monster', monsterId))
      .record as Monster;
    expect(copy.abilities).toMatchObject([
      {
        id: bite,
        ability: { name: 'Укус' },
      },
    ]);
    expect(copy.items).toMatchObject([
      {
        quantity: 2,
        item: { name: 'Клык' },
      },
    ]);
    expect(copy.effects).toMatchObject([{ effect: null, missing: 'deleted' }]);
  });

  it('библиотеку видит и обновляет только мастер', async () => {
    const { master, player, gameId, characterId } = await seated('gl_acl');
    const owner = player.agent;
    const torch = await createItem(owner, { isPublic: true });
    await owner
      .post(`/api/characters/${characterId}/items`)
      .send({ itemId: torch.id, quantity: 1, location: 'carried' })
      .expect(201);
    await master.agent.post(session(gameId)).expect(201);
    const stranger = await user('gl_acl_stranger');
    const routes = [
      (a: request.Agent) => a.get(libraryUrl(gameId)),
      (a: request.Agent) => a.get(`${libraryUrl(gameId)}/item/${torch.id}`),
      (a: request.Agent) =>
        a.get(`${libraryUrl(gameId)}/item/${torch.id}/image`),
      (a: request.Agent) =>
        a.post(`${libraryUrl(gameId)}/item/${torch.id}/refresh`),
    ];
    for (const route of routes) {
      for (const agent of [owner, stranger.agent]) {
        const res = await route(agent).expect(403);
        expect((res.body as { message: string }).message).toBe(
          'Библиотеку игры видит только мастер',
        );
      }
      await route(t.anonymous()).expect(401);
    }
    // Чего нет в библиотеке — 404, неизвестный вид — 400.
    await master.agent
      .get(`${libraryUrl(gameId)}/effect/${torch.id}`)
      .expect(404);
    await master.agent
      .get(`${libraryUrl(gameId)}/item/${torch.id}/image`)
      .expect(404);
    await master.agent
      .get(`${libraryUrl(gameId)}/spell/${torch.id}`)
      .expect(400);
  });
});
