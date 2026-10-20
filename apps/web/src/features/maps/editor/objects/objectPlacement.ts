import {
  CONTAINER_LOOK_LABELS,
  footprintCells,
  insideMap,
  type ContainerLook,
  type CreatureSize,
  type Facing,
  type MapObjectBody,
  type MapSize,
  type ObjectOp,
  type Vec3,
} from 'shared';
import { spanAnchor } from '../editorTools';

// Что ставит инструмент «Объекты» (docs/plan/done/map-objects.md, «Редактор»). «Существо» —
// монстр или НПС из одного поиска, поэтому выбор хранит вид записи каталога.
export type PlaceKind = 'start' | 'creature' | 'container' | 'item';

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  start: 'Старт',
  creature: 'Существо',
  container: 'Контейнер',
  item: 'Предмет',
};

// Запись каталога, выбранная в поиске. size — у монстра: по нему место на карте.
export interface CatalogChoice {
  kind: 'monster' | 'npc' | 'item';
  id: string;
  name: string;
  // Подпись в поиске: имя, у монстра — размер и «уникальный».
  label: string;
  size?: CreatureSize;
}

export interface PlaceSettings {
  kind: PlaceKind;
  creature: CatalogChoice | null;
  item: CatalogChoice | null;
  look: ContainerLook;
  facing: Facing;
}

// Новый объект по настройкам панели; null — существо или предмет ещё не выбраны.
// НПС ставится Средним: размер меняют в свойствах (у персонажа размера нет).
export function placeBody(settings: PlaceSettings): MapObjectBody | null {
  const { kind, creature, item, look, facing } = settings;
  switch (kind) {
    case 'start':
      return { kind: 'start', facing };
    case 'creature':
      if (!creature) return null;
      return creature.kind === 'monster'
        ? { kind: 'monster', monsterId: creature.id, facing }
        : {
            kind: 'npc',
            characterId: creature.id,
            size: 'medium',
            facing,
          };
    case 'container':
      return {
        kind: 'container',
        name: CONTAINER_LOOK_LABELS[look],
        look,
        items: [],
      };
    case 'item':
      return item && { kind: 'item', itemId: item.id, quantity: 1 };
  }
}

// Сторона места ставящегося объекта: у монстра — по размеру из каталога.
export function placeSpan(settings: PlaceSettings): number {
  const { kind, creature } = settings;
  return kind === 'creature' && creature?.kind === 'monster' && creature.size
    ? footprintCells(creature.size)
    : 1;
}

// Клетка объекта, когда курсор над клеткой cell, или null, если место не влезает в
// карту: такую правку сервер отклонил бы, поэтому её и не отправляем.
export function objectCell(
  cell: Vec3,
  span: number,
  size: MapSize,
): Vec3 | null {
  const at = spanAnchor(cell, span);
  const far: Vec3 = [at[0] + span - 1, at[1], at[2] + span - 1];
  return insideMap(at, size) && insideMap(far, size) ? at : null;
}

// Перенос объекта в клетку под курсором; null — переносить некуда или незачем.
export function moveOp(
  object: { id: number; at: Vec3 },
  cell: Vec3,
  span: number,
  size: MapSize,
): ObjectOp | null {
  const at = objectCell(cell, span, size);
  if (!at || at.every((value, axis) => value === object.at[axis])) return null;
  return { op: 'moveObject', id: object.id, at };
}
