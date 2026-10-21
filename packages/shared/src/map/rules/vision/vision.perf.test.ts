import { describe, it } from 'vitest';
import { applyOp } from '../../applyOp.js';
import { MemoryChunkStore } from '../../chunkStore.js';
import type { Box3, Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import { createPalette } from '../../palette.js';
import { creatureBody } from '../creature.js';
import { bodySeen, maskUnion, visibleCells, type Viewer } from './index.js';

// Замер бюджета тумана войны (docs/plan/fog-of-war.md, «Как считаем видимое») на опорной
// карте 100×100×20. Не тест и в CI не идёт — только по запросу:
// VISION_PERF=1 pnpm --filter shared exec vitest run src/map/rules/vision/vision.perf.test.ts

function field(): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [99, 0, 99],
    block: 'grass',
  });
  return map;
}

// Подземелье: комнаты 10×10 со стенами в 4 блока и проёмами посередине стен.
function dungeon(): MapState {
  const map = field();
  for (let i = 0; i <= 100; i += 10) {
    const line = Math.min(i, 99);
    applyOp(map, {
      op: 'fillBox',
      from: [line, 1, 0],
      to: [line, 4, 99],
      block: 'stone',
    });
    applyOp(map, {
      op: 'fillBox',
      from: [0, 1, line],
      to: [99, 4, line],
      block: 'stone',
    });
  }
  for (let i = 0; i < 100; i += 10) {
    for (let j = 5; j < 100; j += 10) {
      applyOp(map, {
        op: 'fillBox',
        from: [i, 1, j],
        to: [i, 2, j],
        block: 'air',
      });
      applyOp(map, {
        op: 'fillBox',
        from: [j, 1, i],
        to: [j, 2, i],
        block: 'air',
      });
    }
  }
  return map;
}

const BOUNDS: Box3 = { min: [0, 0, 0], max: [99, 19, 99] };

const PARTY: Vec3[] = [
  [45, 1, 45],
  [46, 1, 47],
  [44, 1, 43],
  [47, 1, 44],
];

function party(map: MapState, rangeCells: number): Viewer[] {
  return PARTY.map((at) => ({
    body: creatureBody(map, at, 'medium'),
    rangeCells,
  }));
}

// Среднее время одного вызова после прогрева, мс.
function time(run: () => void): string {
  for (let i = 0; i < 3; i++) run();
  const rounds = 10;
  const t0 = performance.now();
  for (let i = 0; i < rounds; i++) run();
  return ((performance.now() - t0) / rounds).toFixed(1);
}

// В shared нет типов Node, поэтому process берём через globalThis.
const env = (
  globalThis as { process?: { env: Record<string, string | undefined> } }
).process?.env;

describe.skipIf(!env?.VISION_PERF)('vision perf', () => {
  it('fits the budget', { timeout: 120_000 }, () => {
    const maps = { field: field(), dungeon: dungeon() };
    const rows: string[] = [];
    for (const [name, map] of Object.entries(maps)) {
      for (const range of [12, 24]) {
        const viewers = party(map, range);
        const one = time(() => visibleCells(map, viewers[0], BOUNDS));
        const four = time(() => {
          const all = new Map();
          for (const v of viewers) maskUnion(all, visibleCells(map, v, BOUNDS));
        });
        const monsters = time(() => {
          for (let i = 0; i < 20; i++) {
            const at: Vec3 = [30 + ((i * 7) % 40), 1, 30 + ((i * 13) % 40)];
            bodySeen(map, viewers, creatureBody(map, at, 'medium'));
          }
        });
        rows.push(
          `${name} ${range * 5} ft: one ${one} ms, party of 4 ${four} ms, 20 monsters ${monsters} ms`,
        );
      }
    }
    console.log(rows.join('\n'));
  });
});
