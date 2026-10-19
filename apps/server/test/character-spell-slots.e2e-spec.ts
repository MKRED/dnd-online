import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { characterBody } from './support/character-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Ячейки заклинаний (docs/plan/character-abilities.md, этап 1): число задаёт форма (PUT),
// потраченные меняются точечно (PATCH spellSlotsExpended).
describe('ячейки заклинаний (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;

  const slots = {
    '1': { total: 4, expended: 0 },
    '2': { total: 2, expended: 0 },
  };

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
      .send(characterBody({ spellSlots: slots }))
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const spend = (
    agent: request.Agent,
    id: string,
    spellSlotsExpended: object,
  ) => agent.patch(`/api/characters/${id}`).send({ spellSlotsExpended });

  it('потратить и вернуть: меняются только присланные круги', async () => {
    const id = await create();
    const spent = await spend(owner, id, { '1': 3 }).expect(200);
    expect(spent.body).toMatchObject({
      spellSlots: { '1': { total: 4, expended: 3 }, '2': slots['2'] },
    });

    await spend(owner, id, { '1': 1, '2': 2 }).expect(200);
    const rest = await spend(owner, id, { '1': 0, '2': 0 }).expect(200);
    expect(rest.body).toMatchObject({ spellSlots: slots });
  });

  it('вместе с другими полями PATCH', async () => {
    const id = await create();
    const res = await owner
      .patch(`/api/characters/${id}`)
      .send({ hitPointsCurrent: 3, spellSlotsExpended: { '2': 1 } })
      .expect(200);
    expect(res.body).toMatchObject({
      hitPointsCurrent: 3,
      spellSlots: { '2': { total: 2, expended: 1 } },
    });
  });

  it('потратить больше, чем ячеек, или у круга без ячеек — 400, ничего не меняется', async () => {
    const id = await create();
    await spend(owner, id, { '1': 1 }).expect(200);
    const tooMany = await spend(owner, id, { '1': 2, '2': 3 }).expect(400);
    expect(tooMany.body).toMatchObject({
      message: 'Ячеек 2 круга меньше, чем потрачено',
    });
    await spend(owner, id, { '3': 1 }).expect(400);

    const card = await owner.get(`/api/characters/${id}`).expect(200);
    expect(card.body).toMatchObject({
      spellSlots: { '1': { total: 4, expended: 1 }, '2': slots['2'] },
    });
  });

  it('неверная форма — 400', async () => {
    const id = await create();
    for (const value of [
      { '0': 1 },
      { '10': 1 },
      { '1': -1 },
      { '1': 1.5 },
      { '1': '1' },
      [1],
      5,
    ]) {
      await spend(owner, id, value as object).expect(400);
    }
    // Число ячеек круга — до 9 (предел приложения, не книги).
    await owner
      .put(`/api/characters/${id}`)
      .send(characterBody({ spellSlots: { '1': { total: 10, expended: 0 } } }))
      .expect(400);
  });

  it('форма без spellSlots не сбрасывает потраченные', async () => {
    const id = await create();
    await spend(owner, id, { '1': 2 }).expect(200);
    const res = await owner
      .put(`/api/characters/${id}`)
      .send(characterBody({ name: 'Торин II' }))
      .expect(200);
    expect(res.body).toMatchObject({
      name: 'Торин II',
      spellSlots: { '1': { total: 4, expended: 2 } },
    });
  });

  it('аноним — 401, чужой — 404, по ссылке видит, но не тратит', async () => {
    const id = await create();
    await t
      .anonymous()
      .patch(`/api/characters/${id}`)
      .send({ spellSlotsExpended: { '1': 1 } })
      .expect(401);
    await spend(stranger, id, { '1': 1 }).expect(404);

    await owner
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);
    const seen = await stranger.get(`/api/characters/${id}`).expect(200);
    expect(seen.body).toMatchObject({ spellSlots: slots });
    await spend(stranger, id, { '1': 1 }).expect(404);

    const card = await owner.get(`/api/characters/${id}`).expect(200);
    expect(card.body).toMatchObject({ spellSlots: slots });
  });
});
