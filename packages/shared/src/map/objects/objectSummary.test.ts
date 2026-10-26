import { describe, expect, it } from 'vitest';
import { MemoryChunkStore } from '../chunkStore.js';
import { applyOps } from '../opsBatch.js';
import { createPalette } from '../palette.js';
import type { MapObject } from './mapObject.js';
import { emptyRefsView, type MapObjectRefsView } from './objectRefViews.js';
import { objectSliceLines, summarizeObjects } from './objectSummary.js';

const GOBLIN = '00000000-0000-4000-8000-000000000001';
const GONE = '00000000-0000-4000-8000-000000000002';
const ROPE = '00000000-0000-4000-8000-000000000003';

// Карта 8 × 8 с каменным полом 4 × 4 и стеной в [3, 1, 0].
function floorMap() {
  const map = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 8, depth: 8 },
  };
  applyOps(map, [
    { op: 'fillBox', from: [0, 0, 0], to: [3, 0, 3], block: 'stone' },
    { op: 'setBlock', at: [3, 1, 0], block: 'stone' },
  ]);
  return map;
}

const base = { hidden: false } as const;
const objects: MapObject[] = [
  { ...base, id: 1, at: [0, 1, 0], kind: 'start', facing: 0 },
  { ...base, id: 2, at: [3, 1, 0], kind: 'start', facing: 90 },
  {
    ...base,
    id: 3,
    at: [1, 1, 1],
    kind: 'monster',
    monsterId: GOBLIN,
    facing: 0,
  },
  { ...base, id: 4, at: [6, 1, 6], kind: 'item', itemId: ROPE, quantity: 2 },
  {
    ...base,
    id: 5,
    at: [2, 1, 2],
    kind: 'monster',
    monsterId: GONE,
    facing: 0,
  },
  {
    ...base,
    id: 6,
    at: [7, 1, 7],
    kind: 'npc',
    characterId: GONE,
    size: 'large',
    facing: 0,
  },
];

const refs: MapObjectRefsView = {
  ...emptyRefsView(),
  monsters: {
    [GOBLIN]: {
      missing: null,
      name: 'Гоблин',
      size: 'small',
      role: 'regular',
      image: null,
      model: null,
    },
    [GONE]: { missing: 'deleted', size: 'medium' },
  },
  items: {
    [ROPE]: { missing: null, name: 'Верёвка', image: null, weight: 10 },
  },
  npcs: { [GONE]: { missing: 'hidden' } },
};

describe('summarizeObjects', () => {
  it('подписи, номера стартов и предупреждения', () => {
    const summary = summarizeObjects(floorMap(), objects, refs);
    expect(summary.map((o) => [o.id, o.label, o.warnings])).toEqual([
      [1, 'Старт 1', []],
      [2, 'Старт 2', [expect.stringContaining('нельзя стоять')]],
      [3, 'Гоблин', []],
      [4, 'Верёвка ×2', ['висит в воздухе']],
      [5, 'монстр (удалён из каталога)', ['монстр удалён из каталога']],
      [
        6,
        'НПС (скрыт автором)',
        ['за границей карты — не рисуется', 'НПС скрыт автором'],
      ],
    ]);
    expect(summary[2]).toMatchObject({ size: 'small', facing: 0 });
  });

  it('контейнер называет вид, только если имя с ним не совпадает', () => {
    const chest = (
      id: number,
      name: string,
      look: 'chest' | 'barrel',
    ): MapObject => ({
      ...base,
      id,
      at: [0, 1, 0],
      kind: 'container',
      name,
      look,
      items: [{ itemId: ROPE, quantity: 1 }],
    });
    const labels = summarizeObjects(
      floorMap(),
      [chest(1, 'Сундук', 'chest'), chest(2, 'Бочка эля', 'barrel')],
      refs,
    ).map((o) => o.label);
    expect(labels).toEqual([
      'Сундук (предметов: 1)',
      'Бочка эля (бочка, предметов: 1)',
    ]);
  });

  it('перегруженный контейнер и взгляд контейнера', () => {
    const sack: MapObject = {
      ...base,
      id: 1,
      at: [0, 1, 0],
      kind: 'container',
      name: 'Мешок',
      look: 'sack',
      items: [{ itemId: ROPE, quantity: 4 }],
    };
    const [summary] = summarizeObjects(floorMap(), [sack], refs);
    expect(summary.warnings).toEqual(['перегружен: 40 из 30 фнт.']);
    // Поставлен до поворота контейнеров — смотрит на север.
    expect(summary.facing).toBe(0);
  });

  it('срез перечисляет объекты своего уровня внутри области', () => {
    const summary = summarizeObjects(floorMap(), objects, refs);
    const lines = objectSliceLines(summary, 1, {
      minX: 0,
      maxX: 3,
      minZ: 0,
      maxZ: 3,
    });
    expect(lines).toContain('#3 Гоблин [1, 1, 1]');
    expect(lines.join('\n')).not.toContain('#4');
    expect(
      objectSliceLines(summary, 0, { minX: 0, maxX: 7, minZ: 0, maxZ: 7 }),
    ).toEqual([]);
  });

  it('скрытый от игроков помечен в сводке и в срезе', () => {
    const hidden = objects.map((o) =>
      o.id === 3 ? { ...o, hidden: true } : o,
    );
    const summary = summarizeObjects(floorMap(), hidden, refs);
    expect(summary.find((s) => s.id === 3)?.hidden).toBe(true);
    expect(summary.find((s) => s.id === 1)).not.toHaveProperty('hidden');
    expect(
      objectSliceLines(summary, 1, { minX: 0, maxX: 3, minZ: 0, maxZ: 3 }),
    ).toContain('#3 Гоблин [1, 1, 1] (скрыт от игроков)');
  });
});
