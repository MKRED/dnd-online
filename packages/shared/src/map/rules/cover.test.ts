import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { MapState } from '../mapState.js';
import type { MapOp } from '../ops.js';
import { createPalette } from '../palette.js';
import {
  attackCover,
  coverFromCounts,
  coverFromPoints,
  exposedSamplePoints,
} from './cover.js';
import { creatureBody, type CreatureSize } from './creature.js';

// Стена в 1 блок по линии x = 5; цель стоит за ней вплотную (x = 6), стрелок —
// на `gap` клеток перед стеной (gap = 1 — вплотную к стене).
const LOW_WALL: MapOp = {
  op: 'fillBox',
  from: [5, 0, -3],
  to: [5, 0, 3],
  block: 'stone',
};

function mapWith(...ops: MapOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  for (const op of ops) applyOp(map, op);
  return map;
}

function coverOver(
  map: MapState,
  gap: number,
  shooter: CreatureSize,
  target: CreatureSize,
) {
  return attackCover(
    map,
    creatureBody(map, [5 - gap, 0, 0], shooter),
    creatureBody(map, [6, 0, 0], target),
    'effect',
  );
}

describe('coverFromCounts', () => {
  it('пороги по доле перекрытых лучей, ровно половина — уже укрытие', () => {
    expect(coverFromCounts(0, 36)).toBe('none');
    expect(coverFromCounts(17, 36)).toBe('none');
    expect(coverFromCounts(18, 36)).toBe('half');
    expect(coverFromCounts(27, 36)).toBe('threeQuarters');
    expect(coverFromCounts(36, 36)).toBe('total');
  });
});

describe('attackCover', () => {
  it('на открытом месте укрытия нет', () => {
    expect(coverOver(mapWith(), 4, 'medium', 'medium')).toBe('none');
  });

  it('человек за стеной в 1 блок — ½ от стрелка в 3 клетках от стены и дальше', () => {
    const map = mapWith(LOW_WALL);
    for (let gap = 3; gap <= 30; gap++) {
      expect(coverOver(map, gap, 'medium', 'medium')).toBe('half');
    }
    // Вплотную к стене стрелок смотрит поверх неё сверху вниз и видит больше.
    expect(coverOver(map, 1, 'medium', 'medium')).toBe('none');
  });

  it('Маленький за стеной в 1 блок укрыт полностью от стрелка в 3 клетках и дальше', () => {
    const map = mapWith(LOW_WALL);
    for (let gap = 3; gap <= 30; gap++) {
      expect(coverOver(map, gap, 'medium', 'small')).toBe('total');
    }
    expect(coverOver(map, 1, 'medium', 'small')).toBe('half');
  });

  it('Маленький из-за стены в 1 блок тоже не стреляет по цели в 3 клетках и дальше', () => {
    const map = mapWith(LOW_WALL);
    const small = creatureBody(map, [6, 0, 0], 'small');
    for (let gap = 3; gap <= 30; gap++) {
      const target = creatureBody(map, [5 - gap, 0, 0], 'medium');
      expect(attackCover(map, small, target, 'effect')).toBe('total');
    }
  });

  it('с балкона Маленького за низкой стеной видно', () => {
    const map = mapWith(LOW_WALL, {
      op: 'fillBox',
      from: [-1, 0, -1],
      to: [1, 3, 1],
      block: 'stone',
    });
    const shooter = creatureBody(map, [0, 4, 0], 'medium');
    const target = creatureBody(map, [6, 0, 0], 'small');
    expect(attackCover(map, shooter, target, 'effect')).not.toBe('total');
  });

  it('щель в полблока (стена, над ней верхняя плита) — ¾', () => {
    const map = mapWith(
      LOW_WALL,
      {
        op: 'fillBox',
        from: [5, 1, -3],
        to: [5, 1, 3],
        block: 'stone_slab_top',
      },
      { op: 'fillBox', from: [5, 2, -3], to: [5, 3, 3], block: 'stone' },
    );
    for (let gap = 1; gap <= 20; gap++) {
      expect(coverOver(map, gap, 'medium', 'medium')).toBe('threeQuarters');
    }
  });

  it('человек на плите за стеной в 1 блок не укрыт', () => {
    const map = mapWith(LOW_WALL, {
      op: 'setBlock',
      at: [6, 0, 0],
      block: 'stone_slab',
    });
    for (let gap = 1; gap <= 20; gap++) {
      expect(coverOver(map, gap, 'medium', 'medium')).toBe('none');
    }
  });

  it('стеклянная стена: видно насквозь, но эффект не проходит', () => {
    const map = mapWith({
      op: 'fillBox',
      from: [5, 0, -3],
      to: [5, 3, 3],
      block: 'glass',
    });
    const shooter = creatureBody(map, [0, 0, 0], 'medium');
    const target = creatureBody(map, [6, 0, 0], 'medium');
    expect(attackCover(map, shooter, target, 'sight')).toBe('none');
    expect(attackCover(map, shooter, target, 'effect')).toBe('total');
  });

  it('точки тела внутри тонкой стены в своей клетке не считаются', () => {
    const map = mapWith({
      op: 'setBlock',
      at: [6, 0, 0],
      block: 'stone_wall',
    });
    const target = creatureBody(map, [6, 0, 0], 'medium');
    // Стена у северного края (z ∈ [0; 0,2], высота 1) прячет точки с z = 0,1 на двух
    // нижних уровнях: 3 × 2 из 36.
    expect(exposedSamplePoints(map, target)).toHaveLength(30);
    const shooter = creatureBody(map, [6, 0, 6], 'medium');
    expect(attackCover(map, shooter, target, 'effect')).toBe('none');
  });

  it('от точки начала области — без выбора лучшей точки', () => {
    const map = mapWith(LOW_WALL);
    const target = creatureBody(map, [6, 0, 0], 'medium');
    // Точка у земли перед стеной: стена закрывает большую часть тела. Высоко над
    // стеной — тело видно целиком.
    expect(coverFromPoints(map, [[3.5, 0.1, 0.5]], target, 'effect')).toBe(
      'threeQuarters',
    );
    expect(coverFromPoints(map, [[3.5, 4.5, 0.5]], target, 'effect')).toBe(
      'none',
    );
  });
});
