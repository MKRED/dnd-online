import { describe, expect, it } from 'vitest';
import {
  INVENTORY_NOTHING_TO_CHANGE,
  INVENTORY_QUANTITY_LIMIT,
  isCheckViolation,
  planEntryChange,
} from './inventory.rules.js';

const carried = { quantity: 3, location: 'carried' as const };

describe('planEntryChange', () => {
  it('пустая правка — ошибка', () => {
    expect(planEntryChange(carried, {}, null)).toEqual({
      error: INVENTORY_NOTHING_TO_CHANGE,
    });
  });

  it('количество меняет саму строку', () => {
    expect(planEntryChange(carried, { quantity: 5 }, null)).toEqual({
      kind: 'update',
      quantity: 5,
      location: 'carried',
    });
  });

  it('перенос туда, где предмета нет, — та же строка в новом месте', () => {
    expect(planEntryChange(carried, { location: 'stash' }, null)).toEqual({
      kind: 'update',
      quantity: 3,
      location: 'stash',
    });
  });

  it('перенос к такому же предмету складывает строки', () => {
    expect(
      planEntryChange(
        carried,
        { location: 'stash', quantity: 2 },
        { id: 't', quantity: 10 },
      ),
    ).toEqual({ kind: 'merge', targetId: 't', quantity: 12 });
  });

  it('сложение сверх лимита — ошибка', () => {
    expect(
      planEntryChange(
        carried,
        { location: 'stash' },
        { id: 't', quantity: 9998 },
      ),
    ).toEqual({ error: INVENTORY_QUANTITY_LIMIT });
  });
});

describe('isCheckViolation', () => {
  const pgError = { code: '23514', constraint: 'character_items_quantity' };

  it('узнаёт ошибку драйвера и обёрнутую drizzle', () => {
    expect(isCheckViolation(pgError, 'character_items_quantity')).toBe(true);
    expect(
      isCheckViolation({ cause: pgError }, 'character_items_quantity'),
    ).toBe(true);
  });

  it('другое ограничение или код — нет', () => {
    expect(isCheckViolation(pgError, 'character_items_location')).toBe(false);
    expect(
      isCheckViolation({ code: '23505' }, 'character_items_quantity'),
    ).toBe(false);
    expect(isCheckViolation(undefined, 'character_items_quantity')).toBe(false);
  });
});
