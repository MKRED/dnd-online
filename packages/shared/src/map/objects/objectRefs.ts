import type { MonsterRole } from '../../monsters.js';
import type { FurnitureMount } from '../../voxelModel/furniture.js';
import type { ModelCellKind } from '../../voxelModel/voxelModel.js';
import type { Box3, Vec3 } from '../coords.js';
import type { CreatureSize } from '../rules/creature.js';
import { footprintCells, type MapObject } from './mapObject.js';

// Что о ссылках объектов знает правка карты. editMap — чистая функция, поэтому
// сервер до применения читает из базы всё, на что ссылается пачка и затронутые ею
// объекты, и передаёт сюда (docs/plan/done/map-objects.md, «Ссылки на каталог»).
export interface MonsterRef {
  name: string;
  size: CreatureSize;
  role: MonsterRole;
  // Можно ли поставить: свой или опубликованный. Скрытый чужой монстр, уже стоящий
  // на карте, остаётся в справочнике ради размера, но заново его не поставить.
  usable: boolean;
}

// Обстановка (docs/plan/blocks.md, этап 8в): размер в клетках и свойства клеток — из её
// модели, у обстановки без модели (модель удалили) — одна клетка без своих свойств.
// usable — своя запись: чужую обстановку на свою карту не ставят, её копируют.
export interface FurnitureRef {
  name: string;
  size: Vec3;
  mount: FurnitureMount;
  cells: Record<string, ModelCellKind>;
  usable: boolean;
}

export interface ObjectRefs {
  // Удалённого монстра здесь нет.
  monsters: Map<string, MonsterRef>;
  // Предметы, которые можно положить (свои или опубликованные), с весом в фунтах:
  // по нему считается груз контейнера.
  items: Map<string, number>;
  // НПС, которых можно поставить: свои персонажи с типом НПС.
  npcs: Set<string>;
  // Удалённой обстановки здесь нет.
  furniture: Map<string, FurnitureRef>;
}

export function emptyObjectRefs(): ObjectRefs {
  return {
    monsters: new Map(),
    items: new Map(),
    npcs: new Set(),
    furniture: new Map(),
  };
}

// Размер места объекта. Удалённый монстр занимает одну клетку, как Средний:
// его размер уже неизвестен, а убрать или сдвинуть такой объект всё равно нужно.
export function objectSize(object: MapObject, refs: ObjectRefs): CreatureSize {
  if (object.kind === 'npc') return object.size;
  if (object.kind === 'monster') {
    return refs.monsters.get(object.monsterId)?.size ?? 'medium';
  }
  return 'medium';
}

// Сторона места объекта в клетках.
export function objectSpan(object: MapObject, refs: ObjectRefs): number {
  return footprintCells(objectSize(object, refs));
}

// Размер обстановки на карте с поворотом: на 90° и 270° ширина и глубина меняются
// местами. Удалённая обстановка — одна клетка: убрать или сдвинуть её всё равно нужно.
export function furnitureExtent(object: MapObject, refs: ObjectRefs): Vec3 {
  if (object.kind !== 'furniture') return [1, 1, 1];
  const [x, y, z] = refs.furniture.get(object.furnitureId)?.size ?? [1, 1, 1];
  return object.facing % 180 === 0 ? [x, y, z] : [z, y, x];
}

// Место объекта — коробка клеток (границы включительно): у обстановки — по модели, у
// остальных — квадрат места в один уровень.
export function objectBox(object: MapObject, refs: ObjectRefs): Box3 {
  const [x, y, z] = object.at;
  if (object.kind === 'furniture') {
    const [ex, ey, ez] = furnitureExtent(object, refs);
    return { min: object.at, max: [x + ex - 1, y + ey - 1, z + ez - 1] };
  }
  const span = objectSpan(object, refs);
  return { min: object.at, max: [x + span - 1, y, z + span - 1] };
}
