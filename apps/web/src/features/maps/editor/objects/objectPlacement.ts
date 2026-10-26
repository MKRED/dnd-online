import {
  buildFurnitureLayer,
  CONTAINER_LOOK_LABELS,
  footprintCells,
  surfaceInCell,
  type CharacterMainImage,
  insideMap,
  type ContainerLook,
  type CreatureSize,
  type Facing,
  type FurnitureContainer,
  type FurnitureViewModel,
  type MapObjectBody,
  type MapState,
  type ObjectRefs,
  type MapSize,
  type ObjectOp,
  type PlacedObject,
  type Vec3,
} from 'shared';
import type { MapViewState } from '../../mapStateFromChunks';
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
  // Вес предмета в фунтах — для груза контейнера.
  weight?: number;
  // Контейнер-обстановка (этап 11): ставится со своим названием и содержимым по умолчанию.
  container?: FurnitureContainer | null;
  // Картинка плитки в окне «Что поставить»: версия миниатюры монстра и предмета, главная
  // картинка НПС, модель обстановки. Хранится и в недавних — их показывают без поиска.
  imageVersion?: number;
  mainImage?: CharacterMainImage;
  model?: FurnitureViewModel;
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
        ...(choice.entry.container && {
          name: choice.entry.name,
          items: choice.entry.container.contents,
        }),
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

// Сколько уровней подряд объект может подняться на обстановку: стопка ящиков, не выше.
const LIFT_MAX = 8;

// Клетка, куда встаёт не-обстановка под курсором; rules — карта с клетками обстановки
// (rulesMap). Обстановку луч не выбирает, и курсор над столом попадает в пол под ним — в
// клетку самого стола. Если стол — опора во всю высоту клетки (воксели до самого верха),
// стоять на нём можно только клеткой выше, как у фигурки «Хода» (walkAnchors); без подъёма
// существо получало «здесь нельзя стоять» (замечания после первой партии, 2026-10-26).
// Обстановка сама так не поднимается: её место строго проверяет постановка.
export function onTopCell(
  rules: MapState,
  kind: MapObjectBody['kind'],
  cell: Vec3,
): Vec3 {
  if (kind === 'furniture') return cell;
  let at = cell;
  for (let i = 0; i < LIFT_MAX && surfaceInCell(rules, at) === 1; i++) {
    at = [at[0], at[1] + 1, at[2]];
  }
  return at;
}

// Карта глазами правил — с клетками обстановки, как useRulesState у страницы.
export function rulesMap(map: MapViewState, refs: ObjectRefs | null): MapState {
  return refs
    ? {
        ...map,
        furniture: buildFurnitureLayer(map.objects.byId.values(), refs),
      }
    : map;
}
