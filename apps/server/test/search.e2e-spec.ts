import {
  DEFAULT_MONSTER_STAT_BLOCK,
  type SearchGroup,
  type SearchKind,
  type SearchResult,
} from 'shared';
import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { characterBody } from './support/character-fixture.js';
import { createItem } from './support/item-fixture.js';
import { monsterBody } from './support/monster-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Общий поиск из шапки (GET /search): названия во всех разделах, свои записи и
// опубликованные чужие; персонажи и карты — только свои.

const noCosts = { uses: null, spellSlot: null, movement: null, hitDie: false };
const abilityBody = (over: Record<string, unknown>) => ({
  name: 'Огненная стрела',
  category: 'basic',
  details: {},
  description: '',
  isPublic: false,
  activation: { kind: 'action' },
  costs: noCosts,
  ...over,
});
const fireball = {
  name: 'Огненный шар',
  category: 'spell',
  details: {
    level: 3,
    school: 'evocation',
    components: 'В, С, М',
    ritual: false,
    duration: { kind: 'instant' },
  },
  costs: { ...noCosts, spellSlot: { minLevel: 3 } },
  isPublic: true,
};
const effectBody = {
  name: 'Охвачен огнём',
  components: [{ kind: 'speed', change: 'double', feet: null, hover: false }],
  description: '',
  isPublic: false,
  duration: { kind: 'time', amount: 1, unit: 'minute', concentration: false },
  saveEnds: null,
};

describe('общий поиск (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let reader: request.Agent;
  let linkedCharacterId: string;

  const search = async (agent: request.Agent, query: string) =>
    (await agent.get(`/api/search?${query}`).expect(200)).body as SearchResult;
  const group = <K extends SearchKind>(result: SearchResult, kind: K) =>
    result.groups.find(
      (g): g is Extract<SearchGroup, { kind: K }> => g.kind === kind,
    );

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('author');
    reader = await t.loginAs('reader');

    await author.post('/api/abilities').send(abilityBody(fireball)).expect(201);
    // Скрытая — видна только автору.
    await author.post('/api/abilities').send(abilityBody({})).expect(201);
    await author.post('/api/abilities').send(abilityBody({ name: 'Лёд' }));
    await author
      .post('/api/monsters')
      .send({
        ...monsterBody(true),
        name: 'Огненный элементаль',
        category: 'elemental',
        statBlock: { ...DEFAULT_MONSTER_STAT_BLOCK, challenge: '5' },
      })
      .expect(201);
    // «Кремень и огниво» по алфавиту раньше, но «Огниво» с запроса начинается.
    await createItem(author, {
      name: 'Кремень и огниво',
      isPublic: true,
    });
    await createItem(author, {
      name: 'Огниво',
      isPublic: true,
      cost: { amount: 5, coin: 'gp' },
    });
    await author.post('/api/effects').send(effectBody).expect(201);
    const npc = await author
      .post('/api/characters')
      .send(characterBody({ kind: 'npc', name: 'Ганс «Огнебород»' }))
      .expect(201);
    linkedCharacterId = (npc.body as { id: string }).id;
    await author
      .put(`/api/characters/${linkedCharacterId}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);
    await author
      .post('/api/maps')
      .send({ name: 'Огненные пещеры' })
      .expect(201);
  });

  afterAll(async () => {
    await t.close();
  });

  it('без входа — 401', async () => {
    await t.anonymous().get('/api/search?q=огн').expect(401);
  });

  it('автор находит всё своё по части названия, без учёта регистра', async () => {
    const result = await search(author, `q=${encodeURIComponent('ОГН')}`);
    expect(result.groups.map((g) => g.kind)).toEqual([
      'ability',
      'monster',
      'character',
      'item',
      'effect',
      'map',
    ]);
    expect(group(result, 'ability')).toEqual({
      kind: 'ability',
      total: 2,
      hits: [
        expect.objectContaining({
          name: 'Огненная стрела',
          category: 'basic',
          spellLevel: null,
          mine: true,
          authorNickname: 'author',
        }),
        expect.objectContaining({
          name: 'Огненный шар',
          category: 'spell',
          spellLevel: 3,
        }),
      ],
    });
    expect(group(result, 'monster')?.hits).toEqual([
      expect.objectContaining({
        name: 'Огненный элементаль',
        type: 'elemental',
        challenge: '5',
      }),
    ]);
    expect(group(result, 'character')?.hits).toEqual([
      {
        id: linkedCharacterId,
        name: 'Ганс «Огнебород»',
        characterKind: 'npc',
        classes: [{ class: 'fighter', level: 1 }],
      },
    ]);
    expect(group(result, 'item')?.hits.map((h) => h.name)).toEqual([
      'Огниво',
      'Кремень и огниво',
    ]);
    expect(group(result, 'item')?.hits[0]).toMatchObject({
      category: 'basic',
      cost: { amount: 5, coin: 'gp' },
    });
    expect(group(result, 'effect')?.hits).toEqual([
      expect.objectContaining({ name: 'Охвачен огнём', components: ['speed'] }),
    ]);
    expect(group(result, 'map')?.hits).toEqual([
      expect.objectContaining({
        name: 'Огненные пещеры',
        width: 32,
        depth: 32,
      }),
    ]);
  });

  it('другой игрок видит только опубликованное, без чужих персонажей и карт', async () => {
    const result = await search(reader, `q=${encodeURIComponent('огн')}`);
    const totals = Object.fromEntries(
      result.groups.map((g) => [g.kind, g.total]),
    );
    // Персонаж открыт по ссылке, но через поиск его не найти.
    expect(totals).toEqual({
      ability: 1,
      monster: 1,
      character: 0,
      item: 2,
      effect: 0,
      map: 0,
    });
    expect(group(result, 'ability')?.hits).toEqual([
      expect.objectContaining({
        name: 'Огненный шар',
        mine: false,
        authorNickname: 'author',
      }),
    ]);
  });

  it('limit режет группу, total — сколько нашлось всего; kind — один раздел', async () => {
    const result = await search(
      author,
      `q=${encodeURIComponent('огн')}&kind=item&limit=1`,
    );
    expect(result.groups).toEqual([
      {
        kind: 'item',
        total: 2,
        hits: [expect.objectContaining({ name: 'Огниво' })],
      },
    ]);
  });

  it('% и _ в запросе — обычные символы', async () => {
    const result = await search(author, `q=${encodeURIComponent('%')}`);
    expect(
      result.groups.every((g) => g.total === 0 && g.hits.length === 0),
    ).toBe(true);
  });

  it('неверный запрос — 400', async () => {
    for (const query of [
      '',
      'q=',
      'q=   ',
      `q=${'а'.repeat(101)}`,
      'q=огн&kind=furniture',
      'q=огн&limit=0',
      'q=огн&limit=51',
      'q=огн&limit=много',
    ]) {
      const res = await author.get(`/api/search?${encodeURI(query)}`);
      expect(res.status, query).toBe(400);
    }
  });
});
