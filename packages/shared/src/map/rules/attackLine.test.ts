import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { MapState } from '../mapState.js';
import type { BlockOp } from '../ops.js';
import { createPalette } from '../palette.js';
import { attackLine } from './attackLine.js';
import { attackCover } from './cover.js';
import { creatureBody } from './creature.js';
import { segmentBlocked } from './segment.js';

function mapWith(...ops: BlockOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  for (const op of ops) applyOp(map, op);
  return map;
}

describe('attackLine', () => {
  it('на открытом месте — из глаз к середине тела цели, без укрытия', () => {
    const map = mapWith();
    const line = attackLine(
      map,
      creatureBody(map, [0, 0, 0], 'medium'),
      creatureBody(map, [6, 0, 0], 'medium'),
      'effect',
    );
    expect(line?.cover).toBe('none');
    expect(line?.from).toEqual([0.5, 1.75, 0.5]);
    expect(line?.to[0]).toBeCloseTo(6.5);
  });

  // Столб в клетке x = 3, z = 0; цель на клетку в сторону за ним. Прямая от груди к её
  // середине задевает столб, а из угла клетки стрелка цель видна.
  it('цель за столбом: прямая к середине упирается в него, а линия выстрела — нет', () => {
    const map = mapWith({
      op: 'fillBox',
      from: [3, 0, 0],
      to: [3, 3, 0],
      block: 'stone',
    });
    const shooter = creatureBody(map, [0, 0, 0], 'medium');
    const target = creatureBody(map, [6, 0, 1], 'medium');
    const line = attackLine(map, shooter, target, 'effect');
    expect(line).not.toBeNull();
    expect(line?.cover).toBe(attackCover(map, shooter, target, 'effect'));
    expect(segmentBlocked(map, [0.5, 1.4, 0.5], [6.5, 1, 1.5], 'effect')).toBe(
      true,
    );
    expect(segmentBlocked(map, line!.from, line!.to, 'effect')).toBe(false);
  });

  it('за полным укрытием линии нет', () => {
    const map = mapWith({
      op: 'fillBox',
      from: [3, 0, -5],
      to: [3, 4, 5],
      block: 'stone',
    });
    const shooter = creatureBody(map, [0, 0, 0], 'medium');
    const target = creatureBody(map, [6, 0, 0], 'medium');
    expect(attackLine(map, shooter, target, 'effect')).toBeNull();
  });
});
