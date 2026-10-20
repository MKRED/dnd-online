import { AIR } from '../cell.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { SizedMapState } from '../mapSize.js';
import { surfaceInCell, type CreatureSize } from '../rules/creature.js';
import { standHeight } from '../rules/standing.js';
import type { SliceRegion } from '../asciiSlice.js';
import {
  CONTAINER_LOOK_LABELS,
  footprintCells,
  objectFacing,
  type Facing,
  type MapObject,
  type MapObjectKind,
} from './mapObject.js';
import {
  CONTAINER_CAPACITY,
  containerLoad,
  loadLabel,
} from './containerLoad.js';
import {
  itemWeight,
  type MapObjectRefsView,
  type RefMissing,
} from './objectRefViews.js';

// Объект в сводке для нейросети: что это, где и что с ним не так.
export interface MapObjectSummary {
  id: number;
  kind: MapObjectKind;
  at: Vec3;
  label: string;
  facing?: Facing;
  size?: CreatureSize;
  // Есть только у скрытого от игроков.
  hidden?: true;
  warnings: string[];
}

const MISSING_LABEL: Record<RefMissing, string> = {
  hidden: 'скрыт автором',
  deleted: 'удалён из каталога',
};

function objectSize(
  object: MapObject,
  refs: MapObjectRefsView,
): CreatureSize | undefined {
  if (object.kind === 'npc') return object.size;
  if (object.kind === 'monster') {
    return refs.monsters[object.monsterId]?.size ?? 'medium';
  }
  return undefined;
}

// Название и заглушка ссылки, если она есть.
function describe(
  object: MapObject,
  refs: MapObjectRefsView,
  startNumber: number,
): { label: string; missing: string[] } {
  const ref = (
    view: { missing: RefMissing | null; name?: string } | undefined,
    what: string,
  ) => {
    if (view?.missing === null && view.name !== undefined) {
      return { name: view.name, missing: [] };
    }
    const missing = view
      ? MISSING_LABEL[view.missing as RefMissing]
      : 'не найден';
    return { name: `${what} (${missing})`, missing: [`${what} ${missing}`] };
  };
  switch (object.kind) {
    case 'start':
      return { label: `Старт ${startNumber}`, missing: [] };
    case 'monster': {
      const { name, missing } = ref(refs.monsters[object.monsterId], 'монстр');
      return { label: name, missing };
    }
    case 'npc': {
      const { name, missing } = ref(refs.npcs[object.characterId], 'НПС');
      return { label: name, missing };
    }
    case 'item': {
      const { name, missing } = ref(refs.items[object.itemId], 'предмет');
      return { label: `${name} ×${object.quantity}`, missing };
    }
    case 'container': {
      const missing = object.items.flatMap(
        ({ itemId }) => ref(refs.items[itemId], `предмет ${itemId}`).missing,
      );
      const look = CONTAINER_LOOK_LABELS[object.look];
      // «Сундук (сундук, …)» — повтор: вид называем, только если имя другое.
      const kind = object.name === look ? '' : `${look.toLowerCase()}, `;
      return {
        label: `${object.name} (${kind}предметов: ${object.items.length})`,
        missing,
      };
    }
  }
}

// Где объекту плохо стоять. Существо и старт проверяются правилами стойки (опора и
// просвет по росту, как фигурка «Хода»), вещь — только «внутри блока» и «в воздухе».
function placementWarnings(
  map: SizedMapState,
  object: MapObject,
  size: CreatureSize | undefined,
): string[] {
  const span = size ? footprintCells(size) : 1;
  const [x, y, z] = object.at;
  if (x + span > map.size.width || z + span > map.size.depth) {
    return ['за границей карты — не рисуется'];
  }
  if (object.kind === 'start' || size) {
    return standHeight(map, object.at, size ?? 'medium') === null
      ? ['здесь нельзя стоять: стена, нет опоры или не хватает высоты']
      : [];
  }
  if (surfaceInCell(map, object.at) === 1) return ['внутри блока'];
  const below: Vec3 = [x, y - 1, z];
  const supported =
    readCell(map.store, object.at) !== AIR || surfaceInCell(map, below) === 1;
  return supported ? [] : ['висит в воздухе'];
}

// Контейнер тяжелее вместимости: правка такого не пропустит, но вес предмета могли
// поменять в каталоге уже после.
function loadWarnings(object: MapObject, refs: MapObjectRefsView): string[] {
  if (object.kind !== 'container') return [];
  const load = containerLoad(object.items, (id) => itemWeight(refs, id));
  const capacity = CONTAINER_CAPACITY[object.look];
  return load > capacity ? [`перегружен: ${loadLabel(load, capacity)}`] : [];
}

export function summarizeObjects(
  map: SizedMapState,
  objects: Iterable<MapObject>,
  refs: MapObjectRefsView,
): MapObjectSummary[] {
  const sorted = [...objects].sort((a, b) => a.id - b.id);
  let starts = 0;
  return sorted.map((object) => {
    if (object.kind === 'start') starts++;
    const size = objectSize(object, refs);
    const { label, missing } = describe(object, refs, starts);
    const facing = objectFacing(object);
    return {
      id: object.id,
      kind: object.kind,
      at: object.at,
      label,
      ...(facing !== null && { facing }),
      ...(size && { size }),
      ...(object.hidden && { hidden: true as const }),
      warnings: [
        ...placementWarnings(map, object, size),
        ...missing,
        ...loadWarnings(object, refs),
      ],
    };
  });
}

// Строки под ASCII-срезом: объекты, стоящие на этом уровне внутри области. На самой
// сетке их нет: символы блоков заняли бы те же знаки, и блок под объектом пропал бы.
export function objectSliceLines(
  summaries: MapObjectSummary[],
  y: number,
  region: SliceRegion,
): string[] {
  const here = summaries.filter(
    ({ at: [x, ay, z] }) =>
      ay === y &&
      x >= region.minX &&
      x <= region.maxX &&
      z >= region.minZ &&
      z <= region.maxZ,
  );
  if (here.length === 0) return [];
  return [
    '',
    'Объекты на этом уровне:',
    ...here.map(
      (o) =>
        `#${o.id} ${o.label} [${o.at.join(', ')}]` +
        (o.hidden ? ' (скрыт от игроков)' : '') +
        (o.warnings.length > 0 ? ` — ${o.warnings.join('; ')}` : ''),
    ),
  ];
}
