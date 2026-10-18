import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from './support/inventory-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Эффекты на персонаже — docs/plan/done/character-effects.md.
interface EffectRow {
  id: string;
  effect: { id: string; name: string } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}

const duration = {
  kind: 'time',
  amount: 1,
  unit: 'minute',
  concentration: true,
};
const haste = { kind: 'speed', change: 'double', feet: null, hover: false };
const effectBody = (over: Record<string, unknown> = {}) => ({
  name: 'Ускорение',
  components: [haste],
  description: '',
  isPublic: false,
  duration,
  saveEnds: null,
  ...over,
});

const url = (characterId: string) => `/api/characters/${characterId}/effects`;

describe('эффекты на персонаже (e2e)', () => {
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

  const createEffect = async (
    agent: request.Agent,
    over: Record<string, unknown> = {},
  ): Promise<string> => {
    const res = await agent
      .post('/api/effects')
      .send(effectBody(over))
      .expect(201);
    return (res.body as { id: string }).id;
  };
  const effectsOf = async (agent: request.Agent, characterId: string) => {
    const res = await agent.get(`/api/characters/${characterId}`).expect(200);
    return (res.body as { effects: EffectRow[] }).effects;
  };
  const openByLink = (characterId: string) =>
    owner
      .put(`/api/characters/${characterId}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);

  it('наложить, повтор — 409, снять', async () => {
    const id = await createCharacter(owner);
    const effectId = await createEffect(owner);
    const added = await owner.post(url(id)).send({ effectId }).expect(201);
    expect(added.body).toEqual([
      {
        id: expect.any(String) as string,
        effect: {
          id: effectId,
          name: 'Ускорение',
          isPublic: false,
          image: null,
          components: [haste],
          duration,
          saveEnds: null,
        },
        missing: null,
        inactive: false,
      },
    ]);
    const [entry] = added.body as EffectRow[];
    expect(await effectsOf(owner, id)).toEqual(added.body);
    const list = await owner.get('/api/characters').expect(200);
    expect(
      (list.body as { id: string; effects: EffectRow[] }[]).find(
        (c) => c.id === id,
      )?.effects,
    ).toHaveLength(1);

    const again = await owner.post(url(id)).send({ effectId }).expect(409);
    expect((again.body as { message: string }).message).toBe(
      'Эффект уже наложен',
    );

    const removed = await owner.delete(`${url(id)}/${entry.id}`).expect(200);
    expect(removed.body).toEqual([]);
    await owner.delete(`${url(id)}/${entry.id}`).expect(404);
    // Снятый можно наложить снова.
    await owner.post(url(id)).send({ effectId }).expect(201);
  });

  it('неверный, несуществующий и чужой скрытый эффект — 400', async () => {
    const id = await createCharacter(owner);
    const hidden = await createEffect(stranger);
    for (const effectId of [
      'nope',
      '00000000-0000-4000-8000-000000000000',
      hidden,
      undefined,
    ]) {
      await owner.post(url(id)).send({ effectId }).expect(400);
    }
    expect(await effectsOf(owner, id)).toEqual([]);
  });

  it('аноним — 401; чужой не меняет, даже если лист открыт по ссылке', async () => {
    const id = await createCharacter(owner);
    const effectId = await createEffect(owner, { isPublic: true });
    const [entry] = (await owner.post(url(id)).send({ effectId }).expect(201))
      .body as EffectRow[];
    await t.anonymous().post(url(id)).send({ effectId }).expect(401);
    await t
      .anonymous()
      .delete(`${url(id)}/${entry.id}`)
      .expect(401);

    await stranger.post(url(id)).send({ effectId }).expect(404);
    await openByLink(id);
    expect(await effectsOf(stranger, id)).toHaveLength(1);
    await stranger.post(url(id)).send({ effectId }).expect(404);
    await stranger.delete(`${url(id)}/${entry.id}`).expect(404);
    expect(await effectsOf(owner, id)).toHaveLength(1);
  });

  it('скрытый после наложения — плашка без карточки; удалённый — «удалён»', async () => {
    const id = await createCharacter(owner);
    const effectId = await createEffect(stranger, {
      name: 'Тайный дар',
      isPublic: true,
    });
    await owner.post(url(id)).send({ effectId }).expect(201);
    await stranger
      .put(`/api/effects/${effectId}`)
      .send(effectBody({ name: 'Тайный дар', isPublic: false }))
      .expect(200);
    const [entry] = await effectsOf(owner, id);
    expect(entry).toMatchObject({ effect: null, missing: 'hidden' });
    expect(JSON.stringify(entry)).not.toContain('Тайный дар');

    // Автор эффекта на чужом листе видит свою карточку, но эффект не действует.
    await openByLink(id);
    expect((await effectsOf(stranger, id))[0]).toMatchObject({
      effect: { name: 'Тайный дар' },
      inactive: true,
    });

    await stranger.delete(`/api/effects/${effectId}`).expect(204);
    expect((await effectsOf(owner, id))[0]).toMatchObject({
      effect: null,
      missing: 'deleted',
    });
    await owner.delete(`${url(id)}/${entry.id}`).expect(200);
  });

  it('свой скрытый эффект владельца зритель по ссылке видит скрытым', async () => {
    const id = await createCharacter(owner);
    const effectId = await createEffect(owner, { name: 'Личное' });
    await owner.post(url(id)).send({ effectId }).expect(201);
    expect((await effectsOf(owner, id))[0]).toMatchObject({
      effect: { name: 'Личное' },
      inactive: false,
    });
    await openByLink(id);
    expect((await effectsOf(stranger, id))[0]).toMatchObject({
      effect: null,
      missing: 'hidden',
    });
  });
});
