import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PNG_FILE, pngImage } from './support/character-fixture.js';
import { createCharacter } from './support/inventory-fixture.js';
import { createItem, itemBody } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Закладки — docs/plan/done/bookmarks.md.
interface BookmarkRow {
  kind: string;
  targetId: string;
  target: {
    name: string;
    authorId: string;
    authorNickname: string;
    image?: unknown;
    mainImage?: unknown;
  } | null;
}

const abilityBody = {
  name: 'Отражение',
  category: 'basic',
  details: {},
  description: '',
  isPublic: true,
  activation: { kind: 'action' },
  costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
};
const effectBody = {
  name: 'Ускорение',
  components: [{ kind: 'speed', change: 'double', feet: null, hover: false }],
  description: '',
  isPublic: true,
  duration: { kind: 'time', amount: 1, unit: 'minute', concentration: true },
  saveEnds: null,
};

const url = (kind: string, id: string) => `/api/bookmarks/${kind}/${id}`;
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('закладки (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let reader: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('author');
    reader = await t.loginAs('reader');
  });

  afterAll(async () => {
    await t.close();
  });

  const listOf = async (agent: request.Agent) => {
    const res = await agent.get('/api/bookmarks').expect(200);
    return res.body as BookmarkRow[];
  };
  const stateOf = async (agent: request.Agent, kind: string, id: string) => {
    const res = await agent.get(url(kind, id)).expect(200);
    return (res.body as { bookmarked: boolean }).bookmarked;
  };
  const publicItem = (name = 'Длинный меч') =>
    createItem(author, { name, isPublic: true });
  const setItemPublic = (id: string, isPublic: boolean) =>
    author
      .put(`/api/items/${id}`)
      .send(itemBody({ name: 'Длинный меч', isPublic }))
      .expect(200);
  const setLinkAccess = (id: string, linkAccess: 'link' | 'private') =>
    author.put(`/api/characters/${id}/access`).send({ linkAccess }).expect(200);

  it('без входа — 401 на всех маршрутах', async () => {
    const anon = t.anonymous();
    await anon.get('/api/bookmarks').expect(401);
    await anon.get(url('item', MISSING_ID)).expect(401);
    await anon.put(url('item', MISSING_ID)).expect(401);
    await anon.delete(url('item', MISSING_ID)).expect(401);
  });

  it('все четыре вида: поставить, увидеть в списке, снять', async () => {
    const characterId = await createCharacter(author);
    await setLinkAccess(characterId, 'link');
    const item = await publicItem();
    const ability = await author
      .post('/api/abilities')
      .send(abilityBody)
      .expect(201);
    const effect = await author
      .post('/api/effects')
      .send(effectBody)
      .expect(201);
    const targets = [
      ['character', characterId],
      ['item', item.id],
      ['ability', (ability.body as { id: string }).id],
      ['effect', (effect.body as { id: string }).id],
    ] as const;

    for (const [kind, id] of targets) {
      expect(await stateOf(reader, kind, id)).toBe(false);
      await reader.put(url(kind, id)).expect(200, { bookmarked: true });
      expect(await stateOf(reader, kind, id)).toBe(true);
    }
    const list = await listOf(reader);
    // Новые сверху.
    expect(list.map((b) => b.kind)).toEqual([
      'effect',
      'ability',
      'item',
      'character',
    ]);
    expect(list.find((b) => b.kind === 'character')?.target).toMatchObject({
      name: 'Торин',
      authorNickname: 'author',
      mainImage: null,
    });
    expect(list.find((b) => b.kind === 'item')?.target).toMatchObject({
      name: 'Длинный меч',
      authorNickname: 'author',
      image: null,
    });

    for (const [kind, id] of targets) {
      await reader.delete(url(kind, id)).expect(204);
      expect(await stateOf(reader, kind, id)).toBe(false);
    }
    expect(await listOf(reader)).toEqual([]);
  });

  it('миниатюры: картинка записи и основная картинка персонажа', async () => {
    const png = await pngImage();
    const item = await publicItem('Щит с гербом');
    await author
      .put(`/api/items/${item.id}/image`)
      .attach('file', png, PNG_FILE)
      .expect(200);
    const characterId = await createCharacter(author);
    await setLinkAccess(characterId, 'link');
    const uploaded = await author
      .post(`/api/characters/${characterId}/images`)
      .attach('file', png, PNG_FILE)
      .expect(201);
    await reader.put(url('item', item.id)).expect(200);
    await reader.put(url('character', characterId)).expect(200);

    const [character, withImage] = await listOf(reader);
    expect(withImage.target?.image).toMatchObject({ version: 1 });
    expect(character.target?.mainImage).toEqual({
      id: (uploaded.body as { id: string }).id,
      thumbVersion: expect.any(Number) as number,
    });
    await reader.delete(url('item', item.id)).expect(204);
    await reader.delete(url('character', characterId)).expect(204);
  });

  it('свои скрытые запись и персонажа — можно, и они не плашки', async () => {
    const item = await createItem(author, { name: 'Черновик' });
    const characterId = await createCharacter(author);
    await author.put(url('item', item.id)).expect(200);
    await author.put(url('character', characterId)).expect(200);
    const list = await listOf(author);
    expect(list.every((b) => b.target !== null)).toBe(true);
    await author.delete(url('item', item.id)).expect(204);
    await author.delete(url('character', characterId)).expect(204);
  });

  it('чужие скрытая запись и закрытый персонаж — 404, как несуществующие', async () => {
    const item = await createItem(author, { name: 'Тайный' });
    const characterId = await createCharacter(author);
    await reader.put(url('item', item.id)).expect(404);
    await reader.put(url('character', characterId)).expect(404);
    await reader.put(url('effect', MISSING_ID)).expect(404);
    expect(await listOf(reader)).toEqual([]);
  });

  it('повтор ничего не добавляет', async () => {
    const item = await publicItem('Щит');
    await reader.put(url('item', item.id)).expect(200);
    await reader.put(url('item', item.id)).expect(200);
    expect(await listOf(reader)).toHaveLength(1);
    await reader.delete(url('item', item.id)).expect(204);
  });

  it('автор скрыл — плашка без названия, открыл снова — закладка обычная', async () => {
    const item = await publicItem();
    await reader.put(url('item', item.id)).expect(200);
    await setItemPublic(item.id, false);
    const [hidden] = await listOf(reader);
    // Плашка — только вид и id: ни названия, ни автора, ни картинки.
    expect(hidden).toEqual({
      kind: 'item',
      targetId: item.id,
      createdAt: expect.any(String) as string,
      target: null,
    });
    expect(await stateOf(reader, 'item', item.id)).toBe(true);

    await setItemPublic(item.id, true);
    const [back] = await listOf(reader);
    expect(back.target?.name).toBe('Длинный меч');
    await reader.delete(url('item', item.id)).expect(204);
  });

  it('персонаж стал «Только я» — плашка, её можно убрать', async () => {
    const characterId = await createCharacter(author);
    await setLinkAccess(characterId, 'link');
    await reader.put(url('character', characterId)).expect(200);
    await setLinkAccess(characterId, 'private');
    const [hidden] = await listOf(reader);
    expect(hidden).toMatchObject({ kind: 'character', target: null });
    // Снять закладку на недоступную цель можно: проверки доступа у DELETE нет.
    await reader.delete(url('character', characterId)).expect(204);
    expect(await listOf(reader)).toEqual([]);
  });

  it('автор удалил запись — закладка пропадает', async () => {
    const item = await publicItem();
    await reader.put(url('item', item.id)).expect(200);
    await author.delete(`/api/items/${item.id}`).expect(204);
    expect(await listOf(reader)).toEqual([]);
  });

  it('чужие закладки не видны и не снимаются', async () => {
    const item = await publicItem();
    await reader.put(url('item', item.id)).expect(200);
    expect(await listOf(author)).toEqual([]);
    expect(await stateOf(author, 'item', item.id)).toBe(false);
    // Снять можно только свою: чужая строка остаётся.
    await author.delete(url('item', item.id)).expect(204);
    expect(await listOf(reader)).toHaveLength(1);
    await reader.delete(url('item', item.id)).expect(204);
  });

  it('неизвестный вид или не UUID — 400', async () => {
    for (const send of [
      () => reader.get(url('map', MISSING_ID)),
      () => reader.put(url('map', MISSING_ID)),
      () => reader.delete(url('map', MISSING_ID)),
      () => reader.put(url('item', 'not-a-uuid')),
      () => reader.get(url('item', 'not-a-uuid')),
    ]) {
      await send().expect(400);
    }
  });
});
