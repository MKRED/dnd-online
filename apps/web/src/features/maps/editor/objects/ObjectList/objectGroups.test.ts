import { describe, expect, it } from 'vitest';
import type { MapObjectSummary } from 'shared';
import { objectGroups } from './objectGroups';

const summary = (
  id: number,
  kind: MapObjectSummary['kind'],
  label: string,
): MapObjectSummary => ({ id, kind, label, at: [0, 0, 0], warnings: [] });

const ALL = [
  summary(3, 'container', 'Сундук (предметов: 1)'),
  summary(1, 'start', 'Старт 1'),
  summary(5, 'npc', 'Трактирщик'),
  summary(2, 'monster', 'Гоблин'),
  summary(9, 'furniture', 'Дверь'),
];

describe('objectGroups', () => {
  it('группы по видам в своём порядке, внутри — по номерам, пустых нет', () => {
    expect(
      objectGroups(ALL).map((g) => [g.title, g.rows.map((r) => r.id)]),
    ).toEqual([
      ['Существа', [2, 5]],
      ['Старты', [1]],
      ['Контейнеры', [3]],
      ['Обстановка', [9]],
    ]);
  });

  it('поиск по части имени без регистра и по номеру', () => {
    expect(
      objectGroups(ALL, 'гоб').flatMap((g) => g.rows.map((r) => r.id)),
    ).toEqual([2]);
    expect(
      objectGroups(ALL, '№9').flatMap((g) => g.rows.map((r) => r.id)),
    ).toEqual([9]);
    expect(
      objectGroups(ALL, '5').flatMap((g) => g.rows.map((r) => r.id)),
    ).toEqual([5]);
    expect(objectGroups(ALL, 'нет такого')).toEqual([]);
  });
});
