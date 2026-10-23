import { describe, expect, it } from 'vitest';
import {
  checkFurniturePositions,
  furnitureModelIds,
  isGroundMount,
  readFurniturePositions,
} from './furniture.js';

const closed = { name: 'Закрыта', modelId: 'a' };
const open = { name: 'Открыта', modelId: 'b' };

describe('checkFurniturePositions', () => {
  it('без положений и с двумя — в порядке', () => {
    expect(checkFurniturePositions({ modelId: 'a', positions: [] })).toBe(null);
    expect(
      checkFurniturePositions({ modelId: 'a', positions: [closed, open] }),
    ).toBe(null);
  });

  it('одно положение и больше восьми — отказ', () => {
    expect(
      checkFurniturePositions({ modelId: 'a', positions: [closed] }),
    ).toContain('от 2 до 8');
    const many = Array.from({ length: 9 }, (_, i) => ({
      name: `П${i}`,
      modelId: 'a',
    }));
    expect(
      checkFurniturePositions({ modelId: 'a', positions: many }),
    ).toContain('от 2 до 8');
  });

  it('пустое и повторённое имя — отказ', () => {
    expect(
      checkFurniturePositions({
        modelId: 'a',
        positions: [closed, { name: '  ', modelId: 'b' }],
      }),
    ).toContain('Название положения');
    expect(
      checkFurniturePositions({
        modelId: 'a',
        positions: [closed, { name: ' Закрыта ', modelId: 'b' }],
      }),
    ).toBe('Положение «Закрыта» повторяется');
  });

  it('модель первого положения — модель обстановки', () => {
    expect(
      checkFurniturePositions({ modelId: 'b', positions: [closed, open] }),
    ).toContain('первого положения');
  });
});

describe('положения из базы', () => {
  it('читает список и отбрасывает лишние поля', () => {
    expect(readFurniturePositions([{ ...closed, extra: 1 }, open])).toEqual([
      closed,
      open,
    ]);
  });

  it('испорченное — без положений', () => {
    expect(readFurniturePositions(undefined)).toEqual([]);
    expect(readFurniturePositions([{ name: 1 }])).toEqual([]);
  });

  it('модели записи без повторов', () => {
    expect(
      furnitureModelIds({
        modelId: 'a',
        positions: [closed, open, { name: 'Ещё', modelId: 'a' }],
      }),
    ).toEqual(['a', 'b']);
  });
});

it('на полу и в проёме — клетки для пути, на стене и потолке — нет', () => {
  expect(isGroundMount('floor')).toBe(true);
  expect(isGroundMount('doorway')).toBe(true);
  expect(isGroundMount('wall')).toBe(false);
  expect(isGroundMount('ceiling')).toBe(false);
});
