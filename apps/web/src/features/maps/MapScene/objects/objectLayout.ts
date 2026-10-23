import {
  CONTAINER_LOOK_LABELS,
  CREATURE_SIZES,
  feetHeight,
  footprintCells,
  standHeight,
  summarizeObjects,
  type ContainerLook,
  type CreatureSize,
  type Facing,
  type FigureModel,
  type MapObject,
  type MapObjectRefsView,
  type Point3,
  type Vec3,
  type VoxelModelFields,
} from 'shared';
import type { MapViewState } from '../../mapStateFromChunks';
import { CATALOG_OBJECT_IMAGES, type ObjectImagePaths } from './objectImages';

// 3D-модель существа (docs/plan/done/character-models.md): путь байтов в API (с версией) и
// как её ставить.
export type CreatureModelInput = Pick<
  FigureModel,
  'format' | 'color' | 'fit'
> & { path: string };

// Как объект выглядит в сцене (docs/plan/done/map-objects.md, «Как выглядят объекты»).
// image — путь миниатюры в API или null; letter — что писать на карточке без картинки.
export type SceneObjectLook =
  | {
      kind: 'creature';
      // pc — фигурка персонажа игрока на сцене игры (docs/plan/done/game.md, этап 7).
      side: 'monster' | 'npc' | 'pc';
      size: CreatureSize;
      facing: Facing;
      image: string | null;
      letter: string;
      // Скрыт автором или удалён — серая карточка со знаком вопроса.
      missing: boolean;
      // С ней на карте стоит модель, а не карточка; пока она грузится — карточка.
      model: CreatureModelInput | null;
    }
  | { kind: 'start'; number: number; facing: Facing }
  | { kind: 'container'; look: ContainerLook; facing: Facing }
  | { kind: 'item'; image: string | null; letter: string; missing: boolean }
  // Обстановка (docs/plan/blocks.md, этап 8в): модель вокселями; extent — место на карте
  // с поворотом. model null — модель или сама обстановка удалены: рамка места.
  | {
      kind: 'furniture';
      facing: Facing;
      model: VoxelModelFields | null;
      extent: Vec3;
    };

export interface SceneObject {
  id: number;
  // Клетка ног — по ней туман войны решает, видит ли объект группа.
  at: Vec3;
  // Уровень клетки ног: выше среза по высоте объект не рисуется.
  level: number;
  // Середина места на высоте ног.
  base: Point3;
  // Сторона места: у Крошечного 0,5, у Большого 2.
  footprint: number;
  // Верх объекта — над ним подсказка с именем.
  top: number;
  label: string;
  warnings: string[];
  // Существу или старту здесь негде стоять: подставка красная.
  blocked: boolean;
  // Скрыт от игроков: мастер видит его полупрозрачным.
  hidden: boolean;
  look: SceneObjectLook;
}

// Высота плоских объектов (плитка старта, предмет) и контейнера — для подсказки.
const FLAT_TOP = 0.1;
const CONTAINER_TOP = 0.9;

// Угол поворота вокруг y для взгляда: взгляд считается по часовой от севера (−z), а
// положительный поворот three.js — против часовой при виде сверху.
export function facingAngle(facing: Facing): number {
  return (-facing * Math.PI) / 180;
}

const letterOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

function creatureLook(
  object: Extract<MapObject, { kind: 'monster' | 'npc' }>,
  refs: MapObjectRefsView,
  images: ObjectImagePaths,
): Extract<SceneObjectLook, { kind: 'creature' }> {
  if (object.kind === 'monster') {
    const ref = refs.monsters[object.monsterId];
    const found = ref?.missing === null ? ref : null;
    return {
      kind: 'creature',
      side: 'monster',
      size: ref?.size ?? 'medium',
      facing: object.facing,
      image: found?.image
        ? images.monster(object.monsterId, found.image.version)
        : null,
      letter: found ? letterOf(found.name) : '?',
      missing: !found,
      model: null,
    };
  }
  const ref = refs.npcs[object.characterId];
  const found = ref?.missing === null ? ref : null;
  return {
    kind: 'creature',
    side: 'npc',
    size: object.size,
    facing: object.facing,
    image: found?.mainImage
      ? images.npc(object.characterId, found.mainImage)
      : null,
    letter: found ? letterOf(found.name) : '?',
    missing: !found,
    model: found?.model
      ? {
          path: images.npcModel(object.characterId, found.model.version),
          format: found.model.format,
          color: found.model.color,
          fit: found.model.fit,
        }
      : null,
  };
}

function lookOf(
  object: MapObject,
  refs: MapObjectRefsView,
  startNumber: number,
  images: ObjectImagePaths,
): SceneObjectLook {
  switch (object.kind) {
    case 'start':
      return { kind: 'start', number: startNumber, facing: object.facing };
    case 'monster':
    case 'npc':
      return creatureLook(object, refs, images);
    case 'container':
      // У поставленных до поворота контейнеров взгляда нет — север.
      return {
        kind: 'container',
        look: object.look,
        facing: object.facing ?? 0,
      };
    case 'furniture': {
      const ref = refs.furniture?.[object.furnitureId];
      const model = ref?.missing === null ? ref.model : null;
      const [x, y, z] = model?.size ?? [1, 1, 1];
      return {
        kind: 'furniture',
        facing: object.facing,
        model,
        extent: object.facing % 180 === 0 ? [x, y, z] : [z, y, x],
      };
    }
    case 'item': {
      const ref = refs.items[object.itemId];
      const found = ref?.missing === null ? ref : null;
      return {
        kind: 'item',
        image: found?.image
          ? images.item(object.itemId, found.image.version)
          : null,
        letter: found ? letterOf(found.name) : '?',
        missing: !found,
      };
    }
  }
}

// Объекты для сцены: что рисовать, где и как. Подпись и предупреждения — из той же
// сводки, что видит нейросеть, чтобы номера стартов и заглушки совпадали. Объектов за
// границей карты (после сужения с cut «keep») нет: они не рисуются.
// hideContents — содержимое контейнеров смотрящему не отдают (игрок на сцене игры):
// подпись без числа предметов и без перегруза, иначе сундук выглядел бы пустым.
export function layoutObjects(
  state: MapViewState,
  refs: MapObjectRefsView,
  images: ObjectImagePaths = CATALOG_OBJECT_IMAGES,
  hideContents = false,
): SceneObject[] {
  const summaries = summarizeObjects(state, state.objects.byId.values(), refs);
  const result: SceneObject[] = [];
  let starts = 0;
  for (const summary of summaries) {
    const object = state.objects.byId.get(summary.id);
    if (!object) continue;
    if (object.kind === 'start') starts++;
    const look = lookOf(object, refs, starts, images);
    const size: CreatureSize = look.kind === 'creature' ? look.size : 'medium';
    const span = look.kind === 'creature' ? footprintCells(size) : 1;
    const [x, y, z] = object.at;
    const [ex, ey, ez] =
      look.kind === 'furniture' ? look.extent : [span, 1, span];
    const outside = x + ex > state.size.width || z + ez > state.size.depth;
    if (outside) continue;
    if (look.kind === 'furniture') {
      // Обстановка стоит дном на нижнем уровне своих клеток; ступени и плиты под ней
      // не поднимают её — место строго по клеткам (этап 8в).
      result.push({
        id: object.id,
        at: object.at,
        level: y,
        base: [x + ex / 2, y, z + ez / 2],
        footprint: Math.max(ex, ez),
        top: y + ey,
        label: summary.label,
        warnings: summary.warnings,
        blocked: false,
        hidden: object.hidden,
        look,
      });
      continue;
    }

    const stands = look.kind === 'creature' || look.kind === 'start';
    const standing = stands ? standHeight(state, object.at, size) : null;
    const feet = standing ?? feetHeight(state, object.at, size);
    const footprint =
      look.kind === 'creature' ? CREATURE_SIZES[size].footprint : 1;
    // Крошечный стоит посередине своей клетки, как в creatureBody.
    const middle = look.kind === 'creature' ? Math.max(footprint, 1) / 2 : 0.5;
    const height =
      look.kind === 'creature'
        ? CREATURE_SIZES[size].height
        : look.kind === 'container'
          ? CONTAINER_TOP
          : FLAT_TOP;
    result.push({
      id: object.id,
      at: object.at,
      level: y,
      base: [x + middle, feet, z + middle],
      footprint,
      top: feet + height,
      label:
        hideContents && object.kind === 'container'
          ? containerName(object)
          : summary.label,
      warnings:
        hideContents && object.kind === 'container' ? [] : summary.warnings,
      blocked: stands && standing === null,
      hidden: object.hidden,
      look,
    });
  }
  return result;
}

// Имя контейнера с видом, как в сводке, но без содержимого: «Бочка эля (бочка)».
function containerName(object: Extract<MapObject, { kind: 'container' }>) {
  const look = CONTAINER_LOOK_LABELS[object.look];
  return object.name === look
    ? object.name
    : `${object.name} (${look.toLowerCase()})`;
}

// Пути всех миниатюр, без повторов: по ним грузятся текстуры, и «Сцена готова» ждёт их.
export function objectImagePaths(objects: SceneObject[]): string[] {
  const paths = new Set<string>();
  for (const { look } of objects) {
    if ((look.kind === 'creature' || look.kind === 'item') && look.image) {
      paths.add(look.image);
    }
  }
  return [...paths];
}
