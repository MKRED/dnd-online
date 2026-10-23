import { describe, expect, it } from 'vitest';
import {
  checkFurnitureContainer,
  readFurnitureContainer,
} from './furnitureContainer.js';

// Контейнер — вид обстановки (docs/plan/blocks.md, этап 11).

const chest = { capacity: 360, lockDc: 15 as const, contents: [] };

describe('checkFurnitureContainer', () => {
  it('сундук с хорошим замком и без замка — в порядке', () => {
    expect(checkFurnitureContainer(chest)).toBeNull();
    expect(checkFurnitureContainer({ ...chest, lockDc: null })).toBeNull();
    expect(checkFurnitureContainer({ ...chest, capacity: 0.25 })).toBeNull();
  });

  it('вместимость, Сл и содержимое — с отказом и текстом', () => {
    expect(checkFurnitureContainer({ ...chest, capacity: 0 })).toMatch(
      /Вместимость/,
    );
    expect(checkFurnitureContainer({ ...chest, capacity: 1.234 })).toMatch(
      /до сотых/,
    );
    expect(
      checkFurnitureContainer({ ...chest, lockDc: 12 as unknown as 10 }),
    ).toMatch(/Сл взлома/);
    const cup = { itemId: 'a', quantity: 1 };
    expect(checkFurnitureContainer({ ...chest, contents: [cup, cup] })).toMatch(
      /дважды/,
    );
    expect(
      checkFurnitureContainer({
        ...chest,
        contents: [{ itemId: 'a', quantity: 0 }],
      }),
    ).toMatch(/Количество/);
  });
});

describe('readFurnitureContainer', () => {
  it('читает контейнер, отбрасывая испорченное', () => {
    expect(
      readFurnitureContainer({
        capacity: 120,
        lockDc: 99,
        contents: [{ itemId: 'a', quantity: 2, extra: 1 }, { itemId: 3 }],
      }),
    ).toEqual({
      capacity: 120,
      lockDc: null,
      contents: [{ itemId: 'a', quantity: 2 }],
    });
  });

  it('не контейнер — null', () => {
    expect(readFurnitureContainer(undefined)).toBeNull();
    expect(readFurnitureContainer({ lockDc: 10 })).toBeNull();
  });
});
