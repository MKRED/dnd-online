import { AIR } from '../../cell.js';
import { CHUNK_VOLUME, type Box3, type Vec3 } from '../../coords.js';
import type { MapObject } from '../../objects/mapObject.js';
import { maskHas, type CellMask } from './cellMask.js';

// Сцена глазами игрока под туманом войны (docs/plan/done/fog-of-war.md, «Что получает игрок»).
// Одно правило на всё: чтение сцены, рассылка правок, существа, картинки и путь игрока.
// Если каждое место считало бы по-своему, одно из них рано или поздно выдало бы лишнее.

export interface FogMasks {
  explored: CellMask;
  visible: CellMask;
}

// Существо игрок видит, только пока на него смотрит группа: ушедшее из поля зрения
// исчезает. Остальное (предметы, контейнеры, точки старта) — пока клетка открыта.
// box — место объекта в несколько клеток (обстановка, docs/plan/blocks.md, этап 8в2): его
// видно, когда открыта любая из них, — стол виден, даже если открыт только его край.
// fog === null — туман выключен, видно всё.
export function objectSeen(
  object: Pick<MapObject, 'kind' | 'at'>,
  fog: FogMasks | null,
  box?: Box3,
): boolean {
  if (!fog) return true;
  const creature = object.kind === 'monster' || object.kind === 'npc';
  if (creature) return maskHas(fog.visible, object.at);
  if (!box) return maskHas(fog.explored, object.at);
  const { min, max } = box;
  for (let y = min[1]; y <= max[1]; y++)
    for (let z = min[2]; z <= max[2]; z++)
      for (let x = min[0]; x <= max[0]; x++)
        if (maskHas(fog.explored, [x, y, z])) return true;
  return false;
}

export function creatureSeen(at: Vec3, fog: FogMasks | null): boolean {
  return !fog || maskHas(fog.visible, at);
}

// Чанк без неоткрытых клеток: они становятся воздухом. null — открытого блока в чанке
// нет: такой чанк не отправляется, пустой выдал бы, что там что-то есть.
export function maskChunk(
  chunk: Uint16Array,
  bits: Uint8Array | undefined,
): Uint16Array | null {
  if (!bits) return null;
  const masked = new Uint16Array(CHUNK_VOLUME);
  let any = false;
  for (let index = 0; index < CHUNK_VOLUME; index++) {
    if (chunk[index] === AIR) continue;
    if ((bits[index >> 3] & (1 << (index & 7))) === 0) continue;
    masked[index] = chunk[index];
    any = true;
  }
  return any ? masked : null;
}

// Клетки упакованной правки ([x, y, z, до, после] подряд) только в открытом.
export function exploredCells(cells: number[], explored: CellMask): number[] {
  const kept: number[] = [];
  for (let i = 0; i < cells.length; i += 5) {
    if (maskHas(explored, [cells[i], cells[i + 1], cells[i + 2]])) {
      kept.push(...cells.slice(i, i + 5));
    }
  }
  return kept;
}
