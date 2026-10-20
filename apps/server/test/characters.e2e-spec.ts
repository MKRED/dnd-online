import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { characterBody } from './support/character-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

const ids = (res: request.Response) =>
  (res.body as { id: string }[]).map((c) => c.id);

describe('персонажи (e2e)', () => {
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

  async function create(): Promise<string> {
    const res = await owner
      .post('/api/characters')
      .send(characterBody())
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const setAccess = (id: string, linkAccess: string) =>
    owner.put(`/api/characters/${id}/access`).send({ linkAccess });

  it('новый персонаж закрыт: виден автору, чужому — как несуществующий', async () => {
    const id = await create();
    const card = await owner.get(`/api/characters/${id}`).expect(200);
    expect(card.body).toMatchObject({ name: 'Торин', linkAccess: 'private' });
    expect(ids(await owner.get('/api/characters').expect(200))).toContain(id);

    expect(
      ids(await stranger.get('/api/characters').expect(200)),
    ).not.toContain(id);
    await stranger.get(`/api/characters/${id}`).expect(404);
  });

  it('чужой не может менять, удалять и открывать доступ — ни к закрытому, ни к открытому', async () => {
    const id = await create();
    for (const linkAccess of ['private', 'link']) {
      await setAccess(id, linkAccess).expect(200);
      await stranger
        .put(`/api/characters/${id}`)
        .send(characterBody({ name: 'Чужая правка' }))
        .expect(404);
      await stranger
        .patch(`/api/characters/${id}`)
        .send({ hitPointsCurrent: 0 })
        .expect(404);
      await stranger
        .put(`/api/characters/${id}/access`)
        .send({ linkAccess: 'link' })
        .expect(404);
      await stranger.delete(`/api/characters/${id}`).expect(404);
    }
    const card = await owner.get(`/api/characters/${id}`).expect(200);
    expect(card.body).toMatchObject({ name: 'Торин', hitPointsCurrent: 12 });
  });

  it('по ссылке лист видит любой вошедший, но не в своём списке; закрытие отзывает доступ', async () => {
    const id = await create();
    const opened = await setAccess(id, 'link').expect(200);
    expect(opened.body).toMatchObject({ linkAccess: 'link' });

    await stranger.get(`/api/characters/${id}`).expect(200);
    expect(
      ids(await stranger.get('/api/characters').expect(200)),
    ).not.toContain(id);
    await t.anonymous().get(`/api/characters/${id}`).expect(401);

    await setAccess(id, 'private').expect(200);
    await stranger.get(`/api/characters/${id}`).expect(404);
  });

  it('автор правит лист целиком и точечно, затем удаляет', async () => {
    const id = await create();
    await owner
      .put(`/api/characters/${id}`)
      .send(characterBody({ name: 'Торин II' }))
      .expect(200);
    const patched = await owner
      .patch(`/api/characters/${id}`)
      .send({ hitPointsCurrent: 5, heroicInspiration: 3 })
      .expect(200);
    expect(patched.body).toMatchObject({
      name: 'Торин II',
      hitPointsCurrent: 5,
      heroicInspiration: 3,
    });
    await owner.delete(`/api/characters/${id}`).expect(204);
    await owner.get(`/api/characters/${id}`).expect(404);
  });

  it('неверные данные — 400', async () => {
    const id = await create();
    await owner
      .post('/api/characters')
      .send(characterBody({ hitPointsCurrent: 20 }))
      .expect(400);
    await owner
      .post('/api/characters')
      .send(characterBody({ species: 'Эльф' }))
      .expect(400);
    // Вдохновение — целое от 0 до 50 (домашнее правило, docs/dnd/combat-stats.md).
    for (const heroicInspiration of [51, -1, 1.5, true]) {
      await owner
        .post('/api/characters')
        .send(characterBody({ heroicInspiration }))
        .expect(400);
      await owner
        .patch(`/api/characters/${id}`)
        .send({ heroicInspiration })
        .expect(400);
    }
    // Бонус мастерства — от 2 до 9 (до +9 у НПС из бестиария).
    for (const proficiencyBonus of [1, 10]) {
      await owner
        .put(`/api/characters/${id}`)
        .send(characterBody({ proficiencyBonus }))
        .expect(400);
    }
    await setAccess(id, 'everyone').expect(400);
    await owner.get('/api/characters/not-a-uuid').expect(400);
  });

  it('НПС из бестиария держит бонус мастерства +9', async () => {
    const created = await owner
      .post('/api/characters')
      .send(characterBody({ kind: 'npc', proficiencyBonus: 9 }))
      .expect(201);
    const id = (created.body as { id: string }).id;
    expect(
      (await owner.get(`/api/characters/${id}`).expect(200)).body,
    ).toMatchObject({ kind: 'npc', proficiencyBonus: 9 });
  });

  it('тип: без него — игровой, НПС держится при правке без типа, меняется явно', async () => {
    const pc = await create();
    expect(
      (await owner.get(`/api/characters/${pc}`).expect(200)).body,
    ).toMatchObject({ kind: 'pc' });

    const created = await owner
      .post('/api/characters')
      .send(characterBody({ kind: 'npc', name: 'Трактирщик' }))
      .expect(201);
    const npc = (created.body as { id: string; kind: string }).id;
    expect(created.body).toMatchObject({ kind: 'npc' });

    // Список отдаёт оба типа: делит их браузер.
    const list = await owner.get('/api/characters').expect(200);
    expect(ids(list)).toEqual(expect.arrayContaining([pc, npc]));

    const kept = await owner
      .put(`/api/characters/${npc}`)
      .send(characterBody({ name: 'Трактирщик II' }))
      .expect(200);
    expect(kept.body).toMatchObject({ kind: 'npc', name: 'Трактирщик II' });

    const changed = await owner
      .put(`/api/characters/${npc}`)
      .send(characterBody({ kind: 'pc' }))
      .expect(200);
    expect(changed.body).toMatchObject({ kind: 'pc' });

    const wrong = await owner
      .post('/api/characters')
      .send(characterBody({ kind: 'boss' }))
      .expect(400);
    expect(JSON.stringify(wrong.body)).toContain(
      'Персонаж бывает только игровым или НПС',
    );
  });
});
