import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { deleteConfirmText } from './deleteConfirmText';

const item = (packs?: Item['packs'], holders?: Item['holders']) =>
  ({ name: 'Факел', packs, holders }) as Item;
const pack = (name: string) => ({ id: name, name, isPublic: true });

describe('deleteConfirmText', () => {
  it('без наборов — простой вопрос', () => {
    expect(deleteConfirmText(item())).toBe(
      'Удалить предмет «Факел» безвозвратно?',
    );
    expect(deleteConfirmText(item({ mine: [], othersCount: 0 }))).toBe(
      'Удалить предмет «Факел» безвозвратно?',
    );
  });

  it('называет свои наборы и считает чужие', () => {
    expect(
      deleteConfirmText(
        item({ mine: [pack('Набор учёного')], othersCount: 2 }),
      ),
    ).toBe(
      'Удалить предмет «Факел» безвозвратно?\n\nОн лежит в ваших наборах: «Набор учёного» — и ещё в 2 чужих наборах. Из них он тоже пропадёт.',
    );
    expect(deleteConfirmText(item({ mine: [], othersCount: 21 }))).toContain(
      'Он лежит в 21 чужом наборе.',
    );
  });

  it('называет своих персонажей и считает чужих', () => {
    expect(
      deleteConfirmText(
        item(undefined, {
          mine: [{ id: 'c', name: 'Арагорн' }],
          othersCount: 1,
        }),
      ),
    ).toBe(
      'Удалить предмет «Факел» безвозвратно?\n\nОн лежит у ваших персонажей: «Арагорн» — и ещё у 1 чужого персонажа. В инвентаре останется строка «Предмет удалён автором».',
    );
    expect(
      deleteConfirmText(
        item({ mine: [], othersCount: 2 }, { mine: [], othersCount: 5 }),
      ),
    ).toBe(
      'Удалить предмет «Факел» безвозвратно?\n\nОн лежит в 2 чужих наборах. Из них он тоже пропадёт.\n\nОн лежит у 5 чужих персонажей. В инвентаре останется строка «Предмет удалён автором».',
    );
  });
});
