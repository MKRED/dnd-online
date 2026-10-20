import type { MonsterRole } from '../../monsters.js';
import type { CreatureSize } from '../rules/creature.js';
import { footprintCells, type MapObject } from './mapObject.js';

// Что о ссылках объектов знает правка карты. editMap — чистая функция, поэтому
// сервер до применения читает из базы всё, на что ссылается пачка и затронутые ею
// объекты, и передаёт сюда (docs/plan/map-objects.md, «Ссылки на каталог»).
export interface MonsterRef {
  name: string;
  size: CreatureSize;
  role: MonsterRole;
  // Можно ли поставить: свой или опубликованный. Скрытый чужой монстр, уже стоящий
  // на карте, остаётся в справочнике ради размера, но заново его не поставить.
  usable: boolean;
}

export interface ObjectRefs {
  // Удалённого монстра здесь нет.
  monsters: Map<string, MonsterRef>;
  // Предметы, которые можно положить: свои или опубликованные.
  items: Set<string>;
  // НПС, которых можно поставить: свои персонажи с типом НПС.
  npcs: Set<string>;
}

export function emptyObjectRefs(): ObjectRefs {
  return { monsters: new Map(), items: new Set(), npcs: new Set() };
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
