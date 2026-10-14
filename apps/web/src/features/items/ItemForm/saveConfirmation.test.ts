import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { toFormValues } from './itemFormValues';
import { saveConfirmation } from './saveConfirmation';

const entry = (name: string, isPublic: boolean | null) => ({
  itemId: name,
  quantity: 1,
  item:
    isPublic === null
      ? null
      : { name, category: 'basic' as const, weight: 1, isPublic, image: null },
});

describe('saveConfirmation', () => {
  it('публикация набора со своими скрытыми — спросить про них', () => {
    const values = {
      ...toFormValues(null),
      category: 'pack' as const,
      isPublic: true,
      packContents: [entry('Факел', false), entry('Верёвка', true)],
    };
    expect(saveConfirmation(values, null)).toEqual({
      kind: 'publish',
      hiddenNames: ['Факел'],
    });
    expect(saveConfirmation({ ...values, isPublic: false }, null)).toBeNull();
  });

  it('скрытие предмета из опубликованных наборов — спросить про наборы', () => {
    const saved = {
      isPublic: true,
      packs: {
        mine: [
          { id: 'p1', name: 'Набор путешественника', isPublic: true },
          { id: 'p2', name: 'Черновик', isPublic: false },
        ],
        othersCount: 2,
      },
    } as Item;
    const values = { ...toFormValues(null), isPublic: false };
    expect(saveConfirmation(values, saved)).toEqual({
      kind: 'hide',
      ownPackNames: ['Набор путешественника'],
      othersCount: 2,
    });
    // Уже был скрыт или остаётся опубликованным — спрашивать не о чем.
    expect(saveConfirmation(values, { ...saved, isPublic: false })).toBeNull();
    expect(saveConfirmation({ ...values, isPublic: true }, saved)).toBeNull();
    // Ни в каких опубликованных наборах — тоже.
    const lonely = { ...saved, packs: { mine: [], othersCount: 0 } };
    expect(saveConfirmation(values, lonely)).toBeNull();
  });
});
