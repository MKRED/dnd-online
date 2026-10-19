import { eq } from 'drizzle-orm';
import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database/database.service.js';
import { characterAbilities } from '../src/database/schema/index.js';
import { createCharacter } from './support/inventory-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Способности у персонажа — docs/plan/character-abilities.md, этап 3.
interface AbilityRow {
  id: string;
  prepared: boolean;
  ability: { id: string; name: string } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}

const noCosts = { uses: null, spellSlot: null, movement: null, hitDie: false };
const basicBody = (over: Record<string, unknown> = {}) => ({
  name: 'Второе дыхание',
  category: 'basic',
  details: {},
  description: '',
  isPublic: false,
  activation: { kind: 'bonus_action' },
  costs: {
    ...noCosts,
    uses: { count: { kind: 'fixed', amount: 1 }, recovery: 'short' },
  },
  ...over,
});
const spellBody = (level: number, over: Record<string, unknown> = {}) =>
  basicBody({
    name: level === 0 ? 'Огненный снаряд' : 'Щит',
    category: 'spell',
    details: {
      level,
      school: 'evocation',
      components: 'В, С',
      ritual: false,
      duration: { kind: 'instant' },
    },
    activation: { kind: 'action' },
    costs:
      level === 0 ? noCosts : { ...noCosts, spellSlot: { minLevel: level } },
    ...over,
  });

const url = (characterId: string) => `/api/characters/${characterId}/abilities`;

describe('способности у персонажа (e2e)', () => {
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

  const createAbility = async (agent: request.Agent, body: object) => {
    const res = await agent.post('/api/abilities').send(body).expect(201);
    return (res.body as { id: string }).id;
  };
  const abilitiesOf = async (agent: request.Agent, characterId: string) => {
    const res = await agent.get(`/api/characters/${characterId}`).expect(200);
    return (res.body as { abilities: AbilityRow[] }).abilities;
  };
  const add = async (characterId: string, abilityId: string) => {
    const res = await owner
      .post(url(characterId))
      .send({ abilityId })
      .expect(201);
    return (res.body as AbilityRow[]).find(
      (row) => row.ability?.id === abilityId,
    )!;
  };
  const prepare = (
    agent: request.Agent,
    characterId: string,
    entryId: string,
    prepared: unknown,
  ) => agent.patch(`${url(characterId)}/${entryId}`).send({ prepared });
  const openByLink = (characterId: string) =>
    owner
      .put(`/api/characters/${characterId}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);

  it('добавить, повтор — 409, убрать', async () => {
    const id = await createCharacter(owner);
    const abilityId = await createAbility(owner, basicBody());
    const added = await owner.post(url(id)).send({ abilityId }).expect(201);
    expect(added.body).toEqual([
      {
        id: expect.any(String) as string,
        prepared: false,
        ability: {
          id: abilityId,
          name: 'Второе дыхание',
          isPublic: false,
          image: null,
          category: 'basic',
          level: null,
          activation: { kind: 'bonus_action' },
          costs: {
            ...noCosts,
            uses: { count: { kind: 'fixed', amount: 1 }, recovery: 'short' },
          },
        },
        missing: null,
        inactive: false,
      },
    ]);
    const [entry] = added.body as AbilityRow[];
    expect(await abilitiesOf(owner, id)).toEqual(added.body);
    const list = await owner.get('/api/characters').expect(200);
    expect(
      (list.body as { id: string; abilities: AbilityRow[] }[]).find(
        (c) => c.id === id,
      )?.abilities,
    ).toHaveLength(1);

    const again = await owner.post(url(id)).send({ abilityId }).expect(409);
    expect((again.body as { message: string }).message).toBe(
      'Способность уже добавлена',
    );

    const removed = await owner.delete(`${url(id)}/${entry.id}`).expect(200);
    expect(removed.body).toEqual([]);
    await owner.delete(`${url(id)}/${entry.id}`).expect(404);
    await owner.post(url(id)).send({ abilityId }).expect(201);
  });

  it('подготовить заклинание 1 круга; умение и заговор — 400', async () => {
    const id = await createCharacter(owner);
    const shield = await add(id, await createAbility(owner, spellBody(1)));
    const res = await prepare(owner, id, shield.id, true).expect(200);
    expect((res.body as AbilityRow[])[0]).toMatchObject({
      prepared: true,
      ability: { category: 'spell', level: 1 },
    });
    await prepare(owner, id, shield.id, false).expect(200);
    expect((await abilitiesOf(owner, id))[0].prepared).toBe(false);

    const cantrip = await add(id, await createAbility(owner, spellBody(0)));
    const basic = await add(id, await createAbility(owner, basicBody()));
    for (const entry of [cantrip, basic]) {
      const bad = await prepare(owner, id, entry.id, true).expect(400);
      expect((bad.body as { message: string }).message).toBe(
        'Подготовить можно только заклинание 1 круга и выше',
      );
      // Снять отметку можно всегда.
      await prepare(owner, id, entry.id, false).expect(200);
    }
    for (const value of ['да', 1, undefined]) {
      await prepare(owner, id, shield.id, value).expect(400);
    }
    await prepare(
      owner,
      id,
      '00000000-0000-4000-8000-000000000000',
      true,
    ).expect(404);
    expect((await abilitiesOf(owner, id)).every((r) => !r.prepared)).toBe(true);
  });

  it('неверная, несуществующая и чужая скрытая способность — 400', async () => {
    const id = await createCharacter(owner);
    const hidden = await createAbility(stranger, basicBody());
    for (const abilityId of [
      'nope',
      '00000000-0000-4000-8000-000000000000',
      hidden,
      undefined,
    ]) {
      await owner.post(url(id)).send({ abilityId }).expect(400);
    }
    expect(await abilitiesOf(owner, id)).toEqual([]);
  });

  it('аноним — 401; чужой не меняет, даже если лист открыт по ссылке', async () => {
    const id = await createCharacter(owner);
    const abilityId = await createAbility(
      owner,
      spellBody(1, { isPublic: true }),
    );
    const entry = await add(id, abilityId);
    const anon = t.anonymous();
    await anon.post(url(id)).send({ abilityId }).expect(401);
    await prepare(anon, id, entry.id, true).expect(401);
    await anon.delete(`${url(id)}/${entry.id}`).expect(401);

    await stranger.post(url(id)).send({ abilityId }).expect(404);
    await openByLink(id);
    expect(await abilitiesOf(stranger, id)).toHaveLength(1);
    await stranger.post(url(id)).send({ abilityId }).expect(404);
    await prepare(stranger, id, entry.id, true).expect(404);
    await stranger.delete(`${url(id)}/${entry.id}`).expect(404);
    expect(await abilitiesOf(owner, id)).toMatchObject([{ prepared: false }]);
  });

  it('скрытая после добавления — строка без карточки; удалённая — «удалена»', async () => {
    const id = await createCharacter(owner);
    const abilityId = await createAbility(
      stranger,
      spellBody(1, { name: 'Тайный щит', isPublic: true }),
    );
    const entry = await add(id, abilityId);
    await prepare(owner, id, entry.id, true).expect(200);
    await stranger
      .put(`/api/abilities/${abilityId}`)
      .send(spellBody(1, { name: 'Тайный щит', isPublic: false }))
      .expect(200);
    const [row] = await abilitiesOf(owner, id);
    expect(row).toMatchObject({ ability: null, missing: 'hidden' });
    expect(JSON.stringify(row)).not.toContain('Тайный щит');
    // Скрытую подготовить нельзя: автору персонажа она не видна.
    await prepare(owner, id, entry.id, false).expect(200);
    await prepare(owner, id, entry.id, true).expect(400);

    // Автор способности на чужом листе видит свою карточку, но она не действует.
    await openByLink(id);
    expect((await abilitiesOf(stranger, id))[0]).toMatchObject({
      ability: { name: 'Тайный щит' },
      inactive: true,
    });

    await stranger.delete(`/api/abilities/${abilityId}`).expect(204);
    expect((await abilitiesOf(owner, id))[0]).toMatchObject({
      ability: null,
      missing: 'deleted',
    });
    await owner.delete(`${url(id)}/${entry.id}`).expect(200);
  });

  it('удаление персонажа убирает его способности', async () => {
    const id = await createCharacter(owner);
    const abilityId = await createAbility(owner, basicBody());
    await add(id, abilityId);
    await owner.delete(`/api/characters/${id}`).expect(204);
    const rows = await t.app
      .get(DatabaseService)
      .db.select()
      .from(characterAbilities)
      .where(eq(characterAbilities.characterId, id));
    expect(rows).toEqual([]);
    // Способность каталога остаётся.
    await owner.get(`/api/abilities/${abilityId}`).expect(200);
  });
});
