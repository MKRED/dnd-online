import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BlockGroup } from 'shared';
import { createTestApp, type TestApp } from './support/test-app.js';

// Копии чужих групп блоков и «Подтянуть обновления» (docs/plan/blocks.md, этап 6б).

const groupBody = {
  name: 'Тлеющие угли',
  description: 'жгутся',
  sources: ['Книга мастера'],
  isPublic: true,
  look: 'scorched',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
  shapes: {},
};

const idOf = (res: request.Response) => (res.body as { id: string }).id;
const card = (res: request.Response) => res.body as BlockGroup;

describe('копии групп блоков (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let copier: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('cp_author');
    copier = await t.loginAs('cp_copier');
    stranger = await t.loginAs('cp_stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  const createGroup = async (over: Record<string, unknown> = {}) =>
    idOf(
      await author
        .post('/api/block-groups')
        .send({ ...groupBody, ...over })
        .expect(201),
    );

  const copyOf = async (id: string) =>
    card(await copier.post(`/api/block-groups/${id}/copy`).expect(201));

  const edit = (agent: request.Agent, group: BlockGroup, over: object) =>
    agent.put(`/api/block-groups/${group.id}`).send({
      ...groupBody,
      name: group.name,
      isPublic: group.isPublic,
      ...over,
    });

  it('копия опубликованной — своя скрытая группа со ссылкой на оригинал, её блоки ставятся', async () => {
    const originalId = await createGroup();
    const copy = await copyOf(originalId);
    expect(copy.id).not.toBe(originalId);
    expect(copy).toMatchObject({
      name: 'Тлеющие угли',
      description: 'жгутся',
      sources: ['Книга мастера'],
      isPublic: false,
      authorNickname: 'cp_copier',
      look: 'scorched',
      hazard: 'fire',
      origin: {
        id: originalId,
        name: 'Тлеющие угли',
        authorNickname: 'cp_author',
        available: true,
        updated: false,
      },
    });
    const mapId = idOf(
      await copier.post('/api/maps').send({ name: 'Моя' }).expect(201),
    );
    await copier
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [{ op: 'setBlock', at: [0, 0, 0], block: copy.id }] })
      .expect(200);
  });

  it('скрытую чужую, несуществующую — 404, свою — 400, без входа — 401', async () => {
    const hiddenId = await createGroup({ isPublic: false });
    await copier.post(`/api/block-groups/${hiddenId}/copy`).expect(404);
    await copier
      .post('/api/block-groups/00000000-0000-4000-8000-000000000000/copy')
      .expect(404);
    await author.post(`/api/block-groups/${hiddenId}/copy`).expect(400);
    await t.anonymous().post(`/api/block-groups/${hiddenId}/copy`).expect(401);
  });

  it('правка копии в форме не теряет ссылку на оригинал', async () => {
    const copy = await copyOf(await createGroup());
    const edited = card(
      await edit(copier, copy, { name: 'Мои угли', color: '#123456' }).expect(
        200,
      ),
    );
    expect(edited.color).toBe('#123456');
    expect(edited.origin?.id).toBe(copy.origin?.id);
  });

  it('автор правит оригинал — у копии «обновлён»; обновление берёт вид и свойства, название остаётся своим', async () => {
    const originalId = await createGroup();
    const copy = await copyOf(originalId);
    await edit(copier, copy, { name: 'Мои угли', color: '#000000' }).expect(
      200,
    );
    const original = card(
      await author.get(`/api/block-groups/${originalId}`).expect(200),
    );
    await edit(author, original, {
      color: '#ff8800',
      movementCost: 1,
      description: 'новое описание',
    }).expect(200);

    const before = card(
      await copier.get(`/api/block-groups/${copy.id}`).expect(200),
    );
    expect(before.origin).toMatchObject({ available: true, updated: true });

    const pulled = card(
      await copier.post(`/api/block-groups/${copy.id}/pull`).expect(200),
    );
    expect(pulled).toMatchObject({
      name: 'Мои угли',
      description: 'жгутся',
      isPublic: false,
      color: '#ff8800',
      movementCost: 1,
      origin: { id: originalId, available: true, updated: false },
    });
  });

  it('обновить можно только свою копию: чужую — 404, не копию — 400', async () => {
    const copy = await copyOf(await createGroup());
    await stranger.post(`/api/block-groups/${copy.id}/pull`).expect(404);
    const own = await createGroup();
    await author.post(`/api/block-groups/${own}/pull`).expect(400);
  });

  it('оригинал скрыт или удалён — «недоступен», обновление — 409, копия цела', async () => {
    const originalId = await createGroup();
    const copy = await copyOf(originalId);
    const original = card(
      await author.get(`/api/block-groups/${originalId}`).expect(200),
    );
    await edit(author, original, { isPublic: false }).expect(200);
    const hidden = card(
      await copier.get(`/api/block-groups/${copy.id}`).expect(200),
    );
    expect(hidden.origin).toMatchObject({ available: false, updated: false });
    await copier.post(`/api/block-groups/${copy.id}/pull`).expect(409);

    await author.delete(`/api/block-groups/${originalId}`).expect(204);
    const deleted = card(
      await copier.get(`/api/block-groups/${copy.id}`).expect(200),
    );
    expect(deleted).toMatchObject({
      color: '#552211',
      origin: { name: 'Тлеющие угли', available: false },
    });
  });
});
