import { eq } from 'drizzle-orm';
import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database/database.service.js';
import { monsterAbilities } from '../src/database/schema/index.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Способности у монстра — docs/plan/done/monsters-npcs.md, этап 5.
interface AbilityRow {
  id: string;
  perDay: number | null;
  ability: { id: string; name: string } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}

const noCosts = { uses: null, spellSlot: null, movement: null, hitDie: false };
const breathBody = (over: Record<string, unknown> = {}) => ({
  name: 'Кислотное дыхание',
  category: 'monster',
  details: { recharge: 5 },
  description: '',
  isPublic: false,
  activation: { kind: 'action' },
  costs: noCosts,
  ...over,
});
const spellBody = (over: Record<string, unknown> = {}) =>
  breathBody({
    name: 'Обнаружение мыслей',
    category: 'spell',
    details: {
      level: 2,
      school: 'divination',
      components: 'В, С, М',
      ritual: false,
      duration: { kind: 'instant' },
    },
    costs: { ...noCosts, spellSlot: { minLevel: 2 } },
    ...over,
  });
const monsterBody = (isPublic: boolean) => ({
  name: 'Аболет',
  category: 'aberration',
  statBlock: DEFAULT_MONSTER_STAT_BLOCK,
  role: 'unique',
  description: '',
  sources: [],
  isPublic,
});

const url = (monsterId: string) => `/api/monsters/${monsterId}/abilities`;

describe('способности у монстра (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('owner');
    stranger = await t.loginAs('stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  const create = async (agent: request.Agent, path: string, body: object) => {
    const res = await agent.post(`/api/${path}`).send(body).expect(201);
    return (res.body as { id: string }).id;
  };
  const createMonster = (isPublic = false) =>
    create(owner, 'monsters', monsterBody(isPublic));
  const abilitiesOf = async (agent: request.Agent, monsterId: string) => {
    const res = await agent.get(`/api/monsters/${monsterId}`).expect(200);
    return (res.body as { abilities: AbilityRow[] }).abilities;
  };
  const add = async (monsterId: string, abilityId: string, perDay?: number) => {
    const res = await owner
      .post(url(monsterId))
      .send({ abilityId, perDay })
      .expect(201);
    return (res.body as AbilityRow[]).find(
      (row) => row.ability?.id === abilityId,
    )!;
  };
  const setPerDay = (monsterId: string, entryId: string, perDay: unknown) =>
    owner.patch(`${url(monsterId)}/${entryId}`).send({ perDay });
  const message = (res: { body: unknown }) =>
    (res.body as { message: string | string[] }).message;

  it('добавить способность «Монстра», повтор — 409, убрать', async () => {
    const id = await createMonster();
    const abilityId = await create(owner, 'abilities', breathBody());
    const added = await owner.post(url(id)).send({ abilityId }).expect(201);
    expect(added.body).toEqual([
      {
        id: expect.any(String) as string,
        perDay: null,
        ability: {
          id: abilityId,
          name: 'Кислотное дыхание',
          isPublic: false,
          image: null,
          category: 'monster',
          level: null,
          activation: { kind: 'action' },
          costs: noCosts,
          recharge: 5,
        },
        missing: null,
        inactive: false,
      },
    ]);
    expect(await abilitiesOf(owner, id)).toEqual(added.body);
    // Список каталога способностей не несёт: они только в карточке.
    const list = await owner.get('/api/monsters?scope=mine').expect(200);
    expect(
      (list.body as { id: string }[]).find((m) => m.id === id),
    ).not.toHaveProperty('abilities');

    const again = await owner.post(url(id)).send({ abilityId }).expect(409);
    expect(message(again)).toBe('Способность уже добавлена');

    const [entry] = added.body as AbilityRow[];
    const removed = await owner.delete(`${url(id)}/${entry.id}`).expect(200);
    expect(removed.body).toEqual([]);
    await owner.delete(`${url(id)}/${entry.id}`).expect(404);
  });

  it('«N/день» — только у заклинания и от 1 до 9', async () => {
    const id = await createMonster();
    const spellId = await create(owner, 'abilities', spellBody());
    const breathId = await create(owner, 'abilities', breathBody());

    const spell = await add(id, spellId, 1);
    expect(spell.perDay).toBe(1);
    const changed = await setPerDay(id, spell.id, 3).expect(200);
    expect((changed.body as AbilityRow[])[0].perDay).toBe(3);
    const cleared = await setPerDay(id, spell.id, null).expect(200);
    expect((cleared.body as AbilityRow[])[0].perDay).toBeNull();

    for (const perDay of [0, 10, 1.5, '2'])
      expect(
        message(await setPerDay(id, spell.id, perDay).expect(400)),
      ).toEqual(['Частота — от 1 до 9 раз в день']);
    // Поле обязательно: пропуск не равен «неограниченно».
    await owner
      .patch(`${url(id)}/${spell.id}`)
      .send({})
      .expect(400);

    const notSpell = await owner
      .post(url(id))
      .send({ abilityId: breathId, perDay: 2 })
      .expect(400);
    expect(message(notSpell)).toBe('Частоту в день задают только заклинанию');
    const breath = await add(id, breathId);
    await setPerDay(id, breath.id, 2).expect(400);
    await setPerDay(id, breath.id, null).expect(200);
  });

  it('неверная, несуществующая и чужая скрытая способность — 400', async () => {
    const id = await createMonster();
    const hiddenId = await create(stranger, 'abilities', breathBody());
    for (const abilityId of ['nope', crypto.randomUUID(), hiddenId])
      await owner.post(url(id)).send({ abilityId }).expect(400);
    expect(await abilitiesOf(owner, id)).toEqual([]);
    // Чужую опубликованную — можно, и заклинание тоже.
    const publicId = await create(
      stranger,
      'abilities',
      spellBody({ isPublic: true }),
    );
    await add(id, publicId, 2);
  });

  it('аноним — 401; чужой опубликованный — 403, скрытый — 404', async () => {
    const hidden = await createMonster(false);
    const published = await createMonster(true);
    const abilityId = await create(
      stranger,
      'abilities',
      breathBody({ isPublic: true }),
    );
    const entry = await add(published, abilityId);

    await t.anonymous().post(url(published)).send({ abilityId }).expect(401);
    const forbidden = await stranger
      .post(url(published))
      .send({ abilityId })
      .expect(403);
    expect(message(forbidden)).toBe('Менять монстра может только его автор');
    await stranger.delete(`${url(published)}/${entry.id}`).expect(403);
    await stranger
      .patch(`${url(published)}/${entry.id}`)
      .send({ perDay: null })
      .expect(403);
    await stranger.post(url(hidden)).send({ abilityId }).expect(404);
    // Чужой видит способности опубликованного монстра в карточке.
    expect(await abilitiesOf(stranger, published)).toHaveLength(1);
    // Строка другого монстра по своему адресу не находится.
    await owner.delete(`${url(hidden)}/${entry.id}`).expect(404);
  });

  it('скрытая после добавления — заглушка; удалённая — «удалена»', async () => {
    const id = await createMonster(true);
    const abilityId = await create(
      stranger,
      'abilities',
      spellBody({ name: 'Тайное заклинание', isPublic: true }),
    );
    const entry = await add(id, abilityId, 1);
    await stranger
      .put(`/api/abilities/${abilityId}`)
      .send(spellBody({ name: 'Тайное заклинание', isPublic: false }))
      .expect(200);
    const [row] = await abilitiesOf(owner, id);
    expect(row).toMatchObject({ ability: null, missing: 'hidden', perDay: 1 });
    expect(JSON.stringify(row)).not.toContain('Тайное заклинание');
    // Скрытой частоту задать нельзя, снять — можно.
    await setPerDay(id, entry.id, 2).expect(400);
    await setPerDay(id, entry.id, null).expect(200);

    // Автор способности видит её на чужом монстре, но у монстра она не действует.
    expect((await abilitiesOf(stranger, id))[0]).toMatchObject({
      ability: { name: 'Тайное заклинание' },
      inactive: true,
    });

    await stranger.delete(`/api/abilities/${abilityId}`).expect(204);
    expect((await abilitiesOf(owner, id))[0]).toMatchObject({
      ability: null,
      missing: 'deleted',
    });
    await owner.delete(`${url(id)}/${entry.id}`).expect(200);
  });

  it('удаление монстра убирает его способности', async () => {
    const id = await createMonster();
    const abilityId = await create(owner, 'abilities', breathBody());
    await add(id, abilityId);
    await owner.delete(`/api/monsters/${id}`).expect(204);
    const rows = await t.app
      .get(DatabaseService)
      .db.select()
      .from(monsterAbilities)
      .where(eq(monsterAbilities.monsterId, id));
    expect(rows).toEqual([]);
    await owner.get(`/api/abilities/${abilityId}`).expect(200);
  });
});
