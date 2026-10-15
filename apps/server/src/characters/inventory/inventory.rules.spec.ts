import { describe, expect, it } from 'vitest';
import {
  INVENTORY_MOVE_TOO_MANY,
  INVENTORY_NOTHING_TO_CHANGE,
  INVENTORY_QUANTITY_LIMIT,
  INVENTORY_SAME_PLACE,
  isCheckViolation,
  planEntryChange,
  planMove,
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

describe('planMove', () => {
  it('в то же место — ошибка', () => {
    expect(
      planMove(carried, { location: 'carried', quantity: 1 }, null),
    ).toEqual({
      error: INVENTORY_SAME_PLACE,
    });
  });

  it('больше, чем лежит, — ошибка', () => {
    expect(planMove(carried, { location: 'stash', quantity: 4 }, null)).toEqual(
      {
        error: INVENTORY_MOVE_TOO_MANY,
      },
    );
  });

  it('вся стопка — как перенос строки', () => {
    expect(planMove(carried, { location: 'stash', quantity: 3 }, null)).toEqual(
      {
        kind: 'update',
        quantity: 3,
        location: 'stash',
      },
    );
    expect(
      planMove(
        carried,
        { location: 'stash', quantity: 3 },
        { id: 't', quantity: 1 },
      ),
    ).toEqual({ kind: 'merge', targetId: 't', quantity: 4 });
  });

  it('часть — в новую строку или к такой же', () => {
    expect(planMove(carried, { location: 'stash', quantity: 1 }, null)).toEqual(
      {
        kind: 'split',
        remaining: 2,
        targetId: null,
        quantity: 1,
        location: 'stash',
      },
    );
    expect(
      planMove(
        carried,
        { location: 'stash', quantity: 2 },
        { id: 't', quantity: 5 },
      ),
    ).toEqual({
      kind: 'split',
      remaining: 1,
      targetId: 't',
      quantity: 7,
      location: 'stash',
    });
  });

  it('часть сверх лимита в новом месте — ошибка', () => {
    expect(
      planMove(
        carried,
        { location: 'stash', quantity: 1 },
        { id: 't', quantity: 9999 },
      ),
    ).toEqual({ error: INVENTORY_QUANTITY_LIMIT });
  });
});
