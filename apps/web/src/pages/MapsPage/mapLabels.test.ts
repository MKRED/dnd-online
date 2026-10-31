import { describe, expect, it } from 'vitest';
import { editedLabel, startsLabel } from './mapLabels';

describe('startsLabel', () => {
  it('склоняет число стартов', () => {
    expect(startsLabel(0)).toBe('нет стартов');
    expect(startsLabel(1)).toBe('1 старт');
    expect(startsLabel(3)).toBe('3 старта');
    expect(startsLabel(5)).toBe('5 стартов');
  });
});

describe('editedLabel', () => {
  const now = new Date(2026, 10, 1, 9, 0);

  it('сегодня и вчера — словами, по календарным дням', () => {
    expect(editedLabel(new Date(2026, 10, 1, 0, 5).toISOString(), now)).toBe(
      'изменена сегодня',
    );
    expect(editedLabel(new Date(2026, 9, 31, 23, 50).toISOString(), now)).toBe(
      'изменена вчера',
    );
  });

  it('раньше — дата, в прошлом году — с годом', () => {
    expect(editedLabel(new Date(2026, 9, 29).toISOString(), now)).toMatch(
      /^29 окт/,
    );
    expect(editedLabel(new Date(2025, 9, 29).toISOString(), now)).toMatch(
      /2025/,
    );
  });
});
