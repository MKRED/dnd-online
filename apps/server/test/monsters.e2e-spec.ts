import { describe, expect, it } from 'vitest';
import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import { describeCatalog } from './support/catalog-scenario/index.js';

// Каталог монстров — docs/plan/done/monsters-npcs.md, этап 3. Доступ, источники и картинку
// проверяет общий сценарий, здесь — свои поля: тип, стат-блок и роль.
const statBlock = {
  ...DEFAULT_MONSTER_STAT_BLOCK,
  size: 'large',
  armorClass: 17,
  initiative: 7,
  hitPoints: { average: 150, dice: { count: 20, die: 10, bonus: 40 } },
  speed: { ...DEFAULT_MONSTER_STAT_BLOCK.speed, walk: 10, swim: 40 },
  senses: [{ sense: 'darkvision', range: 120 }],
  conditionImmunities: ['frightened'],
  challenge: '10',
  lairXp: 7200,
  legendaryActions: 3,
  legendaryActionsLair: 4,
};
const messages = (res: { body: unknown }) =>
  (res.body as { message: string[] }).message;

describeCatalog(
  {
    path: 'monsters',
    body: {
      name: 'Аболет',
      category: 'aberration',
      statBlock,
      role: 'unique',
      description: 'тест',
      isPublic: false,
    },
    invalid: { statBlock: { ...statBlock, challenge: '31' } },
  },
  (get) => {
    describe('тип, стат-блок и роль', () => {
      it('сохраняются, читаются и меняются правкой', async () => {
        const { author, url, body, create } = get();
        const { id } = await create();
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          category: 'aberration',
          statBlock,
          role: 'unique',
        });
        expect(card.body).not.toHaveProperty('details');
        const edited = await author
          .put(url(id))
          .send(
            body({
              category: 'dragon',
              statBlock: { ...statBlock, challenge: '1/8' },
              role: 'regular',
            }),
          )
          .expect(200);
        expect(edited.body).toMatchObject({
          category: 'dragon',
          statBlock: { challenge: '1/8' },
          role: 'regular',
        });
        const list = await author.get(url()).query({ scope: 'mine' });
        expect(
          (list.body as { id: string; category: string }[]).find(
            (m) => m.id === id,
          ),
        ).toMatchObject({ category: 'dragon' });
      });

      it('неверные тип, роль или стат-блок — 400', async () => {
        const { author, url, body } = get();
        const typeRes = await author
          .post(url())
          .send(body({ category: 'kaiju' }))
          .expect(400);
        expect(messages(typeRes)).toContain('Неизвестный тип существа');
        const roleRes = await author
          .post(url())
          .send(body({ role: 'boss' }))
          .expect(400);
        expect(messages(roleRes)).toContain(
          'Роль монстра — обычный или уникальный',
        );
        for (const bad of [
          undefined,
          { ...statBlock, challenge: 10 },
          { ...statBlock, size: 'colossal' },
          { ...statBlock, legendaryActions: null },
          { ...statBlock, speedBonus: 5 },
          { ...statBlock, immunities: ['fire', 'fire'] },
        ]) {
          const res = await author
            .post(url())
            .send(body({ statBlock: bad }))
            .expect(400);
          expect(messages(res).join('\n')).toContain(
            'Стат-блок монстра задан неверно: ',
          );
        }
        // Ответ называет поле: запросу в обход формы (MCP) иначе неясно, что исправлять.
        const walkRes = await author
          .post(url())
          .send(
            body({
              statBlock: {
                ...statBlock,
                speed: { ...statBlock.speed, walk: null },
              },
            }),
          )
          .expect(400);
        expect(messages(walkRes).join('\n')).toContain(
          'Стат-блок монстра задан неверно: speed — ',
        );
      });
    });
  },
);
