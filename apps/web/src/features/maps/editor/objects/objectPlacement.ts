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
  type PlacedObject,
  type Vec3,
} from 'shared';
import { extentAnchor } from '../editorTools';

// Что ставит инструмент «Объекты» (docs/plan/done/map-objects.md, «Редактор»). «Существо» —
// монстр или НПС из одного поиска, поэтому выбор хранит вид записи каталога.
export type PlaceKind =
  'start' | 'creature' | 'container' | 'item' | 'furniture';

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  start: 'Старт',
  creature: 'Существо',
  container: 'Контейнер',
  item: 'Предмет',
  furniture: 'Обстановка',
};

// Запись каталога, выбранная в поиске. size — у монстра: по нему место на карте;
// modelSize и mount — у обстановки (этап 8в).
export interface CatalogChoice {
  kind: 'monster' | 'npc' | 'item' | 'furniture';
  id: string;
  name: string;
  // Подпись в поиске: имя, у монстра — размер и «уникальный».
  label: string;
  size?: CreatureSize;
  modelSize?: Vec3;
}

export interface PlaceSettings {
  kind: PlaceKind;
  creature: CatalogChoice | null;
  item: CatalogChoice | null;
  furniture: CatalogChoice | null;
  look: ContainerLook;
  facing: Facing;
  // Ставить скрытым от игроков (docs/plan/done/game.md, этап 6).
  hidden: boolean;
}

// Новый объект по настройкам панели; null — существо, предмет или обстановка ещё не
// выбраны.
export function placeBody(settings: PlaceSettings): PlacedObject | null {
  const body = kindBody(settings);
  return body && settings.hidden ? { ...body, hidden: true } : body;
}

// НПС ставится Средним: размер меняют в свойствах (у персонажа размера нет).
function kindBody(settings: PlaceSettings): MapObjectBody | null {
  const { kind, creature, item, furniture, look, facing } = settings;
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
        facing,
      };
    case 'item':
      return item && { kind: 'item', itemId: item.id, quantity: 1 };
    case 'furniture':
      // Обстановка поворачивается только на 90°: 45° округляем назад.
      return (
        furniture && {
          kind: 'furniture',
          furnitureId: furniture.id,
          facing: rightFacing(facing),
        }
      );
  }
}

export const rightFacing = (facing: Facing): Facing =>
  (facing - (facing % 90)) as Facing;

// Размер обстановки на карте с поворотом: на 90° и 270° ширина и глубина меняются.
export function turnedExtent([x, y, z]: Vec3, facing: Facing): Vec3 {
  return facing % 180 === 0 ? [x, y, z] : [z, y, x];
}

// Место ставящегося объекта [ширина, высота, глубина]: у монстра — по размеру из
// каталога, у обстановки — по модели с поворотом.
export function placeExtent(settings: PlaceSettings): Vec3 {
  const { kind, creature, furniture, facing } = settings;
  if (kind === 'furniture' && furniture?.modelSize)
    return turnedExtent(furniture.modelSize, rightFacing(facing));
  const span =
    kind === 'creature' && creature?.kind === 'monster' && creature.size
      ? footprintCells(creature.size)
      : 1;
  return [span, 1, span];
}

// Клетка объекта, когда курсор над клеткой cell, или null, если место не влезает в
// карту: такую правку сервер отклонил бы, поэтому её и не отправляем.
export function objectCell(
  cell: Vec3,
  extent: Vec3,
  size: MapSize,
): Vec3 | null {
  const at = extentAnchor(cell, extent);
  const far: Vec3 = [at[0] + extent[0] - 1, at[1], at[2] + extent[2] - 1];
  return insideMap(at, size) && insideMap(far, size) ? at : null;
}

// Перенос объекта в клетку под курсором; null — переносить некуда или незачем. force —
// перенос обстановки с Shift, без проверок места.
export function moveOp(
  object: { id: number; at: Vec3 },
  cell: Vec3,
  extent: Vec3,
  size: MapSize,
  force = false,
): ObjectOp | null {
  const at = objectCell(cell, extent, size);
  if (!at || at.every((value, axis) => value === object.at[axis])) return null;
  return { op: 'moveObject', id: object.id, at, ...(force && { force: true }) };
}
