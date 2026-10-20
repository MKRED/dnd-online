import {
  CREATURE_SIZES,
  feetHeight,
  footprintCells,
  standHeight,
  summarizeObjects,
  type ContainerLook,
  type CreatureSize,
  type Facing,
  type MapObject,
  type MapObjectRefsView,
  type Point3,
} from 'shared';
import { characterImagePath } from '../../../characters/characterImagesApi';
import { itemImagePath } from '../../../items';
import { monstersApi } from '../../../monsters/monstersApi';
import type { MapViewState } from '../../mapStateFromChunks';

// Как объект выглядит в сцене (docs/plan/done/map-objects.md, «Как выглядят объекты»).
// image — путь миниатюры в API или null; letter — что писать на карточке без картинки.
export type SceneObjectLook =
  | {
      kind: 'creature';
      side: 'monster' | 'npc';
      size: CreatureSize;
      facing: Facing;
      image: string | null;
      letter: string;
      // Скрыт автором или удалён — серая карточка со знаком вопроса.
      missing: boolean;
    }
  | { kind: 'start'; number: number; facing: Facing }
  | { kind: 'container'; look: ContainerLook }
  | { kind: 'item'; image: string | null; letter: string; missing: boolean };

export interface SceneObject {
  id: number;
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
        ? monstersApi.imagePath(object.monsterId, 'thumb', found.image.version)
        : null,
      letter: found ? letterOf(found.name) : '?',
      missing: !found,
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
      ? characterImagePath(
          object.characterId,
          found.mainImage.id,
          'thumb',
          found.mainImage.thumbVersion,
        )
      : null,
    letter: found ? letterOf(found.name) : '?',
    missing: !found,
  };
}

function lookOf(
  object: MapObject,
  refs: MapObjectRefsView,
  startNumber: number,
): SceneObjectLook {
  switch (object.kind) {
    case 'start':
      return { kind: 'start', number: startNumber, facing: object.facing };
    case 'monster':
    case 'npc':
      return creatureLook(object, refs);
    case 'container':
      return { kind: 'container', look: object.look };
    case 'item': {
      const ref = refs.items[object.itemId];
      const found = ref?.missing === null ? ref : null;
      return {
        kind: 'item',
        image: found?.image
          ? itemImagePath(object.itemId, 'thumb', found.image.version)
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
export function layoutObjects(
  state: MapViewState,
  refs: MapObjectRefsView,
): SceneObject[] {
  const summaries = summarizeObjects(state, state.objects.byId.values(), refs);
  const result: SceneObject[] = [];
  let starts = 0;
  for (const summary of summaries) {
    const object = state.objects.byId.get(summary.id);
    if (!object) continue;
    if (object.kind === 'start') starts++;
    const look = lookOf(object, refs, starts);
    const size: CreatureSize = look.kind === 'creature' ? look.size : 'medium';
    const span = look.kind === 'creature' ? footprintCells(size) : 1;
    const [x, y, z] = object.at;
    const outside = x + span > state.size.width || z + span > state.size.depth;
    if (outside) continue;

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
      level: y,
      base: [x + middle, feet, z + middle],
      footprint,
      top: feet + height,
      label: summary.label,
      warnings: summary.warnings,
      blocked: stands && standing === null,
      look,
    });
  }
  return result;
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
