import { describe, expect, it } from 'vitest';
import { objectChoiceMeta, objectChoiceName } from './placeChoice';

const ID = '00000000-0000-4000-8000-000000000001';

describe('подпись плитки объекта', () => {
  it('имя отдельно, размер и крепление — второй строкой', () => {
    const table = {
      kind: 'furniture' as const,
      entry: {
        kind: 'furniture' as const,
        id: ID,
        name: 'Стол алхимика',
        label: 'Стол алхимика · 2×1×1 · на полу',
      },
    };
    expect(objectChoiceName(table)).toBe('Стол алхимика');
    expect(objectChoiceMeta(table)).toBe('2×1×1 · на полу');
  });

  it('у предмета второй строки нет, у НПС — «НПС», у встроенного — только имя', () => {
    const entry = { id: ID, name: 'Жаба', label: 'Жаба' };
    expect(
      objectChoiceMeta({ kind: 'item', entry: { ...entry, kind: 'item' } }),
    ).toBe('');
    expect(
      objectChoiceMeta({ kind: 'creature', entry: { ...entry, kind: 'npc' } }),
    ).toBe('НПС');
    const chest = { kind: 'container' as const, look: 'chest' as const };
    expect(objectChoiceName(chest)).toBe('Сундук');
    expect(objectChoiceMeta(chest)).toBe('');
  });
});
