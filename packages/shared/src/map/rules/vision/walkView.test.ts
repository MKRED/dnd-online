import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../coords.js';
import { createMask, maskAdd } from './cellMask.js';
import type { FogMasks } from './fogView.js';
import { walkSeen } from './walkView.js';

function fogSeeing(cells: Vec3[]): FogMasks {
  const fog: FogMasks = { explored: createMask(), visible: createMask() };
  for (const cell of cells) {
    maskAdd(fog.explored, cell);
    maskAdd(fog.visible, cell);
  }
  return fog;
}

const path: Vec3[] = [
  [0, 1, 0],
  [1, 1, 0],
  [2, 1, 0],
  [3, 1, 0],
  [4, 1, 0],
];

describe('walkSeen', () => {
  it('без тумана путь весь', () => {
    expect(walkSeen(path, null)).toEqual(path);
  });

  it('скрытый кусок в середине — один null', () => {
    const fog = fogSeeing([path[0], path[4]]);
    expect(walkSeen(path, fog)).toEqual([path[0], null, path[4]]);
  });

  it('вышел из тумана: сначала null, потом видимые клетки', () => {
    const fog = fogSeeing([path[3], path[4]]);
    expect(walkSeen(path, fog)).toEqual([null, path[3], path[4]]);
  });

  it('ушёл в туман: видимые клетки и null в конце', () => {
    const fog = fogSeeing([path[0], path[1]]);
    expect(walkSeen(path, fog)).toEqual([path[0], path[1], null]);
  });

  it('ни одной видимой клетки — null', () => {
    expect(walkSeen(path, fogSeeing([]))).toBeNull();
  });

  // Открыто, но не видно сейчас — существо там игрок не видит.
  it('открытая, но невидимая клетка скрыта', () => {
    const fog = fogSeeing([path[0]]);
    maskAdd(fog.explored, path[1]);
    expect(walkSeen(path.slice(0, 2), fog)).toEqual([path[0], null]);
  });
});
