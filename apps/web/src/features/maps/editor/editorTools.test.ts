import { describe, expect, it } from 'vitest';
import { cellsFromHit, regionBox, regionOp, toolCell } from './editorTools';

const settings = { block: 'stone', rotation: 90 as const, height: 1 };

describe('cellsFromHit', () => {
  it('верх куба: попадание в куб, новый блок — над ним', () => {
    expect(cellsFromHit([2.3, 1, 4.7], [0, 1, 0], false)).toMatchObject({
      hit: [2, 0, 4],
      place: [2, 1, 4],
    });
  });

  it('верх плиты на y + 0.5 не путает плиту с клеткой над ней', () => {
    expect(cellsFromHit([0.5, 3.5, 0.5], [0, 1, 0], false)).toMatchObject({
      hit: [0, 3, 0],
      place: [0, 4, 0],
    });
  });

  it('южная грань тонкой стены: попадание в стену, новый блок — южнее', () => {
    expect(cellsFromHit([5.5, 0.5, 7.2], [0, 0, 1], false)).toMatchObject({
      hit: [5, 0, 7],
      place: [5, 0, 8],
    });
  });

  it('западная грань куба в отрицательных координатах', () => {
    expect(cellsFromHit([-3, 0.5, -1.5], [-1, 0, 0], false)).toMatchObject({
      hit: [-3, 0, -2],
      place: [-4, 0, -2],
    });
  });

  it('земля: блока нет, новый блок встаёт на уровень 0', () => {
    expect(cellsFromHit([1.2, 0, -0.4], [0, 1, 0], true)).toMatchObject({
      hit: null,
      place: [1, 0, -1],
    });
  });

  it('передаёт точку попадания и округлённую нормаль', () => {
    expect(cellsFromHit([2.3, 1, 4.7], [0, 0.9999, 0], false)).toMatchObject({
      point: [2.3, 1, 4.7],
      normal: [0, 1, 0],
    });
  });
});

describe('toolCell', () => {
  it('строящие инструменты берут соседнюю клетку, ластик и замена — блок', () => {
    const picked = cellsFromHit([0.5, 1, 0.5], [0, 1, 0], false);
    expect(toolCell('place', picked)).toEqual([0, 1, 0]);
    expect(toolCell('hollow', picked)).toEqual([0, 1, 0]);
    expect(toolCell('erase', picked)).toEqual([0, 0, 0]);
    expect(toolCell('replace', picked)).toEqual([0, 0, 0]);
  });
});

describe('regionBox и regionOp', () => {
  it('упорядочивает углы и наращивает высоту от верхнего угла', () => {
    expect(regionBox([5, 0, 1], [2, 1, 4], 3)).toEqual({
      min: [2, 0, 1],
      max: [5, 3, 4],
    });
  });

  it('собирает операции областей', () => {
    expect(regionOp('hollow', [0, 0, 0], [4, 0, 4], settings, null)).toEqual({
      op: 'hollowBox',
      from: [0, 0, 0],
      to: [4, 0, 4],
      block: 'stone',
      rotation: 90,
    });
    expect(
      regionOp('replace', [0, 0, 0], [1, 0, 1], settings, 'grass'),
    ).toMatchObject({ op: 'replace', match: 'grass', block: 'stone' });
  });
});
