import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  AddInventoryItemDto,
  UpdateInventoryEntryDto,
} from './inventory.dto.js';

function errorsOf<T extends object>(cls: new () => T, body: object) {
  return validateSync(plainToInstance(cls, body)).map((e) => e.property);
}

const itemId = '0b5f1f8e-6a0e-4c43-9a8e-1d2c3b4a5f60';

describe('AddInventoryItemDto', () => {
  it('принимает предмет, количество и место', () => {
    expect(
      errorsOf(AddInventoryItemDto, {
        itemId,
        quantity: 3,
        location: 'stash',
      }),
    ).toEqual([]);
  });

  it('отклоняет не-uuid, ноль, сверх лимита и неизвестное место', () => {
    expect(
      errorsOf(AddInventoryItemDto, {
        itemId: 'x',
        quantity: 0,
        location: 'pocket',
      }),
    ).toEqual(['itemId', 'quantity', 'location']);
    expect(
      errorsOf(AddInventoryItemDto, {
        itemId,
        quantity: 10_000,
        location: 'carried',
      }),
    ).toEqual(['quantity']);
  });
});

describe('UpdateInventoryEntryDto', () => {
  it('поля необязательны по отдельности', () => {
    expect(errorsOf(UpdateInventoryEntryDto, { location: 'stash' })).toEqual(
      [],
    );
    expect(errorsOf(UpdateInventoryEntryDto, { quantity: 2 })).toEqual([]);
  });

  it('дробное количество — ошибка', () => {
    expect(errorsOf(UpdateInventoryEntryDto, { quantity: 1.5 })).toEqual([
      'quantity',
    ]);
  });
});
