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

// Какой объект ставит инструмент «Поставить» (docs/plan/blocks.md, этап 10); блок
// берётся из редактора. «Существо» — монстр или НПС из одного поиска.
export type ObjectChoice =
  | { kind: 'start' }
  | { kind: 'container'; look: ContainerLook }
  | { kind: 'creature' | 'item' | 'furniture'; entry: CatalogChoice };

// choice null — ставится блок, объектов инструмент не ставит.
export interface PlaceSettings {
  choice: ObjectChoice | null;
  facing: Facing;
  // Ставить скрытым от игроков (docs/plan/done/game.md, этап 6).
  hidden: boolean;
}

// Новый объект по настройкам панели; null — ставится блок.
export function placeBody(settings: PlaceSettings): PlacedObject | null {
  const body = kindBody(settings);
  return body && settings.hidden ? { ...body, hidden: true } : body;
}

// НПС ставится Средним: размер меняют в свойствах (у персонажа размера нет).
function kindBody({ choice, facing }: PlaceSettings): MapObjectBody | null {
  if (!choice) return null;
  switch (choice.kind) {
    case 'start':
      return { kind: 'start', facing };
    case 'container':
      return {
        kind: 'container',
        name: CONTAINER_LOOK_LABELS[choice.look],
        look: choice.look,
        items: [],
        facing,
      };
    case 'creature':
      return choice.entry.kind === 'monster'
        ? { kind: 'monster', monsterId: choice.entry.id, facing }
        : {
            kind: 'npc',
            characterId: choice.entry.id,
            size: 'medium',
            facing,
          };
    case 'item':
      return { kind: 'item', itemId: choice.entry.id, quantity: 1 };
    case 'furniture':
      // Обстановка поворачивается только на 90°: 45° округляем назад.
      return {
        kind: 'furniture',
        furnitureId: choice.entry.id,
        facing: rightFacing(facing),
      };
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
export function placeExtent({ choice, facing }: PlaceSettings): Vec3 {
  if (choice?.kind === 'furniture' && choice.entry.modelSize)
    return turnedExtent(choice.entry.modelSize, rightFacing(facing));
  const span =
    choice?.kind === 'creature' &&
    choice.entry.kind === 'monster' &&
    choice.entry.size
      ? footprintCells(choice.entry.size)
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
