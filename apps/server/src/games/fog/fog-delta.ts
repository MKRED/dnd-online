import {
  AIR,
  CHUNK_VOLUME,
  MASK_BYTES,
  cellFromChunk,
  maskHas,
  parseChunkKey,
  readCell,
  sameObject,
  type CellMask,
  type FogChunkBits,
  type MapObject,
  type ObjectChange,
  type PackedChangeset,
  type ScenePlayerFog,
} from 'shared';
import { forPlayer } from '../scenes/scene-player-view.js';
import type { FogRecount } from './fog-recount.js';

// Что запись журнала меняет у игроков под туманом (docs/plan/done/fog-of-war.md, этап 4).
// Копия игрока — проекция сцены масками «до», поэтому «до» правки берётся глазами
// игрока до неё, а «после» — масками после: правка ложится на копию без конфликтов.
// К ней добавляется то, что открылось само (ход фигурки, снесённая стена): блоки в
// новых открытых клетках как поставленные и существа, вошедшие в поле зрения или
// ушедшие из него.

const bitOf = (bits: Uint8Array | undefined, index: number) =>
  bits !== undefined && (bits[index >> 3] & (1 << (index & 7))) !== 0;

function cellKey(x: number, y: number, z: number) {
  return `${x},${y},${z}`;
}

// Клетки правки, как их видит игрок: до — то, что у него было (вне открытого — воздух),
// после — только в открытом.
function editCells(cells: number[], recount: FogRecount): number[] {
  const { before, after } = recount;
  const kept: number[] = [];
  for (let i = 0; i < cells.length; i += 5) {
    const at = [cells[i], cells[i + 1], cells[i + 2]] as const;
    if (!maskHas(after.explored, at)) continue;
    const was = maskHas(before.explored, at) ? cells[i + 3] : AIR;
    if (was !== cells[i + 4]) kept.push(...at, was, cells[i + 4]);
  }
  return kept;
}

// Блоки клеток, открывшихся этой записью и не тронутых самой правкой.
function revealedCells(recount: FogRecount, skip: Set<string>): number[] {
  const { before, after, world } = recount;
  const cells: number[] = [];
  for (const [key, bits] of after.explored) {
    const old = before.explored.get(key);
    const chunk = parseChunkKey(key);
    for (let index = 0; index < CHUNK_VOLUME; index++) {
      if (!bitOf(bits, index) || bitOf(old, index)) continue;
      const [x, y, z] = cellFromChunk(chunk, index);
      if (skip.has(cellKey(x, y, z))) continue;
      const value = readCell(world.map.store, [x, y, z]);
      if (value !== AIR) cells.push(x, y, z, AIR, value);
    }
  }
  return cells;
}

function objectChanges(
  recount: FogRecount,
  edit: ObjectChange[],
): ObjectChange[] {
  const { before, after, world } = recount;
  const changes: ObjectChange[] = [];
  const push = (id: number, was: MapObject | null, now: MapObject | null) => {
    const b = forPlayer(was, before, world.refs);
    const a = forPlayer(now, after, world.refs);
    if (!sameObject(b, a)) changes.push({ id, before: b, after: a });
  };
  for (const change of edit) push(change.id, change.before, change.after);
  const touched = new Set(edit.map((change) => change.id));
  for (const object of world.objects) {
    if (!touched.has(object.id)) push(object.id, object, object);
  }
  return changes;
}

const NONE = new Uint8Array(MASK_BYTES);

// Изменившиеся чанки маски — целиком: клиент заменяет ими свои. Чанк, где всё
// погасло (никого не видно), уходит нулями.
function changedChunks(was: CellMask, now: CellMask): FogChunkBits[] {
  const keys = new Set([...was.keys(), ...now.keys()]);
  return [...keys].flatMap((key) => {
    const a = was.get(key) ?? NONE;
    const b = now.get(key) ?? NONE;
    if (a.every((byte, i) => byte === b[i])) return [];
    const [cx, cy, cz] = parseChunkKey(key);
    return [{ cx, cy, cz, bits: Buffer.from(b).toString('base64') }];
  });
}

export function playerFogDelta(
  recount: FogRecount,
  seq: number,
  edit: PackedChangeset | undefined,
): ScenePlayerFog {
  const cells = edit ? editCells(edit.cells, recount) : [];
  const skip = new Set<string>();
  for (let i = 0; i < (edit?.cells.length ?? 0); i += 5) {
    skip.add(cellKey(edit!.cells[i], edit!.cells[i + 1], edit!.cells[i + 2]));
  }
  cells.push(...revealedCells(recount, skip));
  const objects = objectChanges(recount, edit?.objects ?? []);
  return {
    sceneId: recount.scene.id,
    seq,
    changes: {
      cells,
      paletteAdded: edit?.paletteAdded ?? [],
      ...(objects.length > 0 && { objects }),
    },
    fog: {
      explored: changedChunks(recount.before.explored, recount.after.explored),
      visible: changedChunks(recount.before.visible, recount.after.visible),
    },
  };
}

// Нечего слать: ни блоков, ни объектов, ни масок.
export function emptyDelta({ changes, fog }: ScenePlayerFog): boolean {
  return (
    changes.cells.length === 0 &&
    !changes.objects &&
    fog.explored.length === 0 &&
    fog.visible.length === 0
  );
}
