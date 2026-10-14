import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { deleteConfirmText } from './deleteConfirmText';

const item = (packs?: Item['packs']) => ({ name: 'Факел', packs }) as Item;
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
});
