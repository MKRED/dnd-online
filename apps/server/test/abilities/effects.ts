import { eq } from 'drizzle-orm';
import type request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';
import { fireBolt } from './steps.js';

// Эффекты в исходах шагов (docs/plan/abilities.md, этап 8): ссылки на каталог эффектов с
// правилами состава набора — видимость, публикация только с опубликованными, удаление и
// скрытие эффекта.

const effectBody = (name: string, isPublic: boolean) => ({
  name,
  components: [{ kind: 'condition', condition: 'poisoned' }],
  description: '',
  isPublic,
  duration: { kind: 'time', amount: 1, unit: 'round', concentration: false },
  saveEnds: null,
});

async function createEffect(
  agent: request.Agent,
  name: string,
  isPublic = false,
): Promise<string> {
  const res = await agent
    .post('/api/effects')
    .send(effectBody(name, isPublic))
    .expect(201);
  return (res.body as { id: string }).id;
}

// «Луч болезни»: при попадании — эффект.
const ray = (effectIds: string[], missIds: string[] = []) => ({
  ...fireBolt,
  hit: {
    ...fireBolt.hit,
    effects: effectIds.map((effectId) => ({ effectId })),
  },
  miss: {
    damage: 'none',
    effects: missIds.map((effectId) => ({ effectId })),
  },
});

type Steps = {
  hit: { effects: { effectId: string; effect: unknown }[] };
  miss: { effects: { effectId: string; effect: unknown }[] };
}[];
const stepsOf = (res: { body: unknown }) =>
  (res.body as { steps: Steps }).steps;

export function describeAbilityEffects(get: () => CatalogContext): void {
  describe('эффекты в шагах', () => {
    it('сохраняются и читаются с названием, в списке тоже', async () => {
      const { author, url, create } = get();
      const poisoned = await createEffect(author, 'Отравлен');
      const slowed = await createEffect(author, 'Замедлен');
      const { id } = await create({ steps: [ray([poisoned], [slowed])] });
      const card = await author.get(url(id)).expect(200);
      const [step] = stepsOf(card);
      expect(step.hit.effects).toEqual([
        {
          effectId: poisoned,
          effect: { name: 'Отравлен', isPublic: false, image: null },
        },
      ]);
      expect(step.miss.effects[0]).toMatchObject({
        effect: { name: 'Замедлен' },
      });
      const list = await author.get(`${url()}?scope=mine`).expect(200);
      const listed = (list.body as { id: string; steps: Steps }[]).find(
        (ability) => ability.id === id,
      );
      expect(listed?.steps[0].hit.effects[0]).toMatchObject({
        effect: { name: 'Отравлен' },
      });
      // Правка без эффектов убирает их.
      const edited = await author
        .put(url(id))
        .send(get().body({ steps: [ray([])] }))
        .expect(200);
      expect(stepsOf(edited)[0].hit.effects).toEqual([]);
    });

    it('чужой скрытый эффект — 400, чужой опубликованный — можно', async () => {
      const { author, stranger, url, body } = get();
      const hidden = await createEffect(stranger, 'Чужой скрытый');
      const shared = await createEffect(stranger, 'Чужой открытый', true);
      await author
        .post(url())
        .send(body({ steps: [ray([hidden])] }))
        .expect(400);
      await author
        .post(url())
        .send(body({ steps: [ray([shared])] }))
        .expect(201);
    });

    it('эффект при промахе без проверки, повтор и неверный id — 400', async () => {
      const { author, url, body } = get();
      const poisoned = await createEffect(author, 'Отравлен');
      const noCheck = { ...ray([]), check: { kind: 'none' } };
      for (const step of [
        {
          ...noCheck,
          miss: { damage: 'none', effects: [{ effectId: poisoned }] },
        },
        ray([poisoned, poisoned]),
        ray(['не-id']),
      ]) {
        await author
          .post(url())
          .send(body({ steps: [step] }))
          .expect(400);
      }
    });

    it('публикация со скрытым эффектом — 409, с флагом эффект публикуется', async () => {
      const { author, stranger, url, body } = get();
      const poisoned = await createEffect(author, 'Отравлен');
      const name = 'Луч болезни (публикация)';
      const res = await author
        .post(url())
        .send(body({ name, isPublic: true, steps: [ray([poisoned])] }))
        .expect(409);
      expect((res.body as { message: string }).message).toBe(
        'Сначала опубликуйте эффекты: Отравлен',
      );
      // Отказ ничего не создал.
      const mine = await author.get(`${url()}?scope=mine`).expect(200);
      expect(
        (mine.body as { name: string }[]).some((a) => a.name === name),
      ).toBe(false);
      const created = await author
        .post(url())
        .send(
          body({
            isPublic: true,
            publishEffects: true,
            steps: [ray([poisoned])],
          }),
        )
        .expect(201);
      const id = (created.body as { id: string }).id;
      await stranger.get(`/api/effects/${poisoned}`).expect(200);
      const seen = await stranger.get(url(id)).expect(200);
      expect(stepsOf(seen)[0].hit.effects[0]).toMatchObject({
        effect: { name: 'Отравлен', isPublic: true },
      });
    });

    it('удалённый эффект пропадает, скрытый другим виден как null', async () => {
      const { author, stranger, url, body } = get();
      const gone = await createEffect(author, 'Удаляемый', true);
      const later = await createEffect(author, 'Скрываемый', true);
      const res = await author
        .post(url())
        .send(body({ isPublic: true, steps: [ray([gone, later])] }))
        .expect(201);
      const id = (res.body as { id: string }).id;

      // Автору эффекта — какие способности его накладывают.
      const effectCard = await author.get(`/api/effects/${gone}`).expect(200);
      expect(effectCard.body).toMatchObject({
        abilities: { mine: [{ id, isPublic: true }], othersCount: 0 },
      });
      const strangerCard = await stranger
        .get(`/api/effects/${gone}`)
        .expect(200);
      expect(strangerCard.body).not.toHaveProperty('abilities');

      await author.delete(`/api/effects/${gone}`).expect(204);
      await author
        .put(`/api/effects/${later}`)
        .send(effectBody('Скрываемый', false))
        .expect(200);
      const seen = await stranger.get(url(id)).expect(200);
      expect(stepsOf(seen)[0].hit.effects).toEqual([
        { effectId: later, effect: null },
      ]);
      const own = await author.get(url(id)).expect(200);
      expect(stepsOf(own)[0].hit.effects[0]).toMatchObject({
        effect: { name: 'Скрываемый', isPublic: false },
      });
    });

    it('скрытие эффекта с флагом скрывает и свои способности с ним', async () => {
      const { author, stranger, url, body } = get();
      const poisoned = await createEffect(author, 'Отравлен', true);
      const res = await author
        .post(url())
        .send(body({ isPublic: true, steps: [ray([poisoned])] }))
        .expect(201);
      const id = (res.body as { id: string }).id;
      await author
        .put(`/api/effects/${poisoned}`)
        .send({ ...effectBody('Отравлен', false), hideAbilities: true })
        .expect(200);
      await stranger.get(url(id)).expect(404);
    });

    // Шаги этапов 3–7 лежат в базе без эффектов — читаются без них, а не пропадают.
    it('шаг из базы без эффектов читается без них', async () => {
      const { app, author, url, create } = get();
      const { id } = await create();
      const stored = {
        ...fireBolt,
        hit: { damage: fireBolt.hit.damage, addModifier: false },
        miss: { damage: 'none' },
      };
      await app
        .get(DatabaseService)
        .db.update(abilities)
        .set({ extra: { activation: { kind: 'action' }, steps: [stored] } })
        .where(eq(abilities.id, id));
      const card = await author.get(url(id)).expect(200);
      expect(stepsOf(card)).toEqual([fireBolt]);
    });
  });
}
