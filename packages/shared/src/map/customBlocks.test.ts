import { describe, expect, it } from 'vitest';
import { applyOp } from './applyOp.js';
import { renderAsciiSlice } from './asciiSlice.js';
import { blockInfo } from './blockInfo.js';
import { MemoryChunkStore, readCell } from './chunkStore.js';
import {
  createBlockCatalog,
  customBlockName,
  parseCustomBlockName,
  type BlockGroupInfo,
} from './customBlocks.js';
import { HAZARDS } from './materialHazards.js';
import { MapOpError } from './mapOpError.js';
import type { MapState } from './mapState.js';
import { createPalette, isKnownBlockName } from './palette.js';
import { stepCost } from './rules/step.js';
import { hazardsUnder } from './rules/support.js';
import { summarizeMap } from './summary.js';

const GROUP_ID = '0b5c6f2e-8a1d-4c3b-9e7f-1a2b3c4d5e6f';

const embers: BlockGroupInfo = {
  id: GROUP_ID,
  name: 'Тлеющие угли',
  look: 'scorched',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
  shapes: {},
};

function mapWith(groups: BlockGroupInfo[]): MapState {
  return {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    blocks: createBlockCatalog(groups),
  };
}

describe('имена своих блоков', () => {
  it('id группы для куба и «id_форма» для остальных', () => {
    expect(customBlockName(GROUP_ID, 'cube')).toBe(GROUP_ID);
    expect(customBlockName(GROUP_ID, 'stairs')).toBe(`${GROUP_ID}_stairs`);
    expect(parseCustomBlockName(`${GROUP_ID}_slab`)).toEqual({
      groupId: GROUP_ID,
      shape: 'slab',
    });
    expect(parseCustomBlockName(`${GROUP_ID}_slab_top`)?.shape).toBe(
      'slab_top',
    );
  });

  it('чужое по виду — не имя своего блока', () => {
    expect(parseCustomBlockName('stone')).toBeNull();
    expect(parseCustomBlockName(`${GROUP_ID}_cube`)).toBeNull();
    expect(parseCustomBlockName(`${GROUP_ID}_tower`)).toBeNull();
    expect(isKnownBlockName(`${GROUP_ID}_stairs`)).toBe(true);
    expect(isKnownBlockName('lavaa')).toBe(false);
  });
});

describe('каталог карты со своими группами', () => {
  it('свойства группы — у каждой формы, вид — от базового материала', () => {
    const catalog = createBlockCatalog([embers]);
    expect(catalog.describe(`${GROUP_ID}_stairs`)).toMatchObject({
      label: 'Тлеющие угли: ступени',
      shape: 'stairs',
      material: 'scorched',
      traits: { movementCost: 2, hazard: HAZARDS.fire, color: '#552211' },
    });
    expect(catalog.describe('stone')?.label).toBe('Камень');
    // Без своих текстур — узор основы.
    expect(catalog.describe(GROUP_ID)?.textures).toBeUndefined();
  });

  it('свои текстуры группы — у каждой её формы', () => {
    const tile = btoa(String.fromCharCode(...new Uint8Array(1024)));
    const textures = { top: tile, side: tile, bottom: tile };
    const catalog = createBlockCatalog([{ ...embers, textures }]);
    expect(catalog.describe(`${GROUP_ID}_slab`)?.textures).toBe(textures);
  });

  it('свой блок ставится, и правила читают его свойства', () => {
    const map = mapWith([embers]);
    applyOp(map, {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [1, 0, 0],
      block: GROUP_ID,
    });
    expect(stepCost(map, [0, 1, 0], [1, 1, 0], 'medium')).toBe(10);
    expect(hazardsUnder(map, [0, 1, 0], 'medium')).toEqual([
      { material: 'scorched', hazard: HAZARDS.fire },
    ]);
  });

  it('блок группы, которой нет в каталоге, поставить нельзя', () => {
    const map = mapWith([]);
    expect(() =>
      applyOp(map, { op: 'setBlock', at: [0, 0, 0], block: GROUP_ID }),
    ).toThrow(MapOpError);
  });

  it('после удаления группы её блок — воздух, и снова его не поставить', () => {
    const map = mapWith([embers]);
    applyOp(map, { op: 'setBlock', at: [0, 0, 0], block: GROUP_ID });
    applyOp(map, { op: 'setBlock', at: [1, 0, 0], block: 'stone' });
    const deleted: MapState = { ...map, blocks: createBlockCatalog([]) };

    expect(blockInfo(deleted, readCell(deleted.store, [0, 0, 0]))).toBeNull();
    expect(summarizeMap(deleted).blockCounts).toEqual({ stone: 1 });
    expect(
      renderAsciiSlice(deleted, 0, { minX: 0, maxX: 1, minZ: 0, maxZ: 0 }),
    ).toContain('0 .A');
    expect(() =>
      applyOp(deleted, { op: 'setBlock', at: [2, 0, 0], block: GROUP_ID }),
    ).toThrow(MapOpError);
  });
});

describe('свой вид формы', () => {
  const tile = (byte: number) =>
    btoa(String.fromCharCode(...new Uint8Array(1024).fill(byte)));
  const groupTextures = { top: tile(1), side: tile(1), bottom: tile(1) };
  const stairsTextures = { top: tile(2), side: tile(2), bottom: tile(2) };
  const catalog = createBlockCatalog([
    {
      ...embers,
      textures: groupTextures,
      shapes: { stairs: { textures: stairsTextures, color: '#336699' } },
    },
  ]);

  it('форма со своим видом берёт свои плитки и цвет, остальные — группы', () => {
    const stairs = catalog.describe(`${GROUP_ID}_stairs`);
    expect(stairs?.textures).toBe(stairsTextures);
    expect(stairs?.traits.color).toBe('#336699');
    expect(stairs?.tiles).toBe(`${GROUP_ID}_stairs`);
    // Свойства для правил — по-прежнему группы.
    expect(stairs?.traits.movementCost).toBe(2);

    for (const name of [GROUP_ID, `${GROUP_ID}_slab`]) {
      const block = catalog.describe(name);
      expect(block?.textures).toBe(groupTextures);
      expect(block?.traits.color).toBe(embers.color);
      expect(block?.tiles).toBe(GROUP_ID);
    }
  });
});
