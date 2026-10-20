import type { Vec3 } from '../coords.js';
import { CREATURE_SIZES, type CreatureSize } from '../rules/creature.js';

// Объекты на карте (docs/plan/done/map-objects.md): стоят в клетках, но не в чанках —
// у них свои поля и ссылки на каталог. Меняются только операциями журнала, как блоки.

// Направление взгляда — 8 направлений по сетке, градусы по часовой от севера (−z).
// Правило дома (docs/dnd/facing.md). Это не Rotation блоков: у блока 4 поворота в битах клетки.
export const FACINGS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Facing = (typeof FACINGS)[number];

export function isFacing(value: unknown): value is Facing {
  return FACINGS.includes(value as Facing);
}

// Следующее направление по часовой стрелке (клавиша R в редакторе).
export function nextFacing(facing: Facing): Facing {
  return FACINGS[(FACINGS.indexOf(facing) + 1) % FACINGS.length];
}

// Взгляд по шагу из from в to (docs/plan/game.md, этап 7): фигурка после хода смотрит
// туда, куда шла. Север — −z, по часовой; шаг без сдвига по x и z — север.
export function stepFacing(from: Vec3, to: Vec3): Facing {
  const dx = Math.sign(to[0] - from[0]);
  const dz = Math.sign(to[2] - from[2]);
  if (dx === 0 && dz === 0) return 0;
  const degrees = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return ((Math.round(degrees / 45) * 45 + 360) % 360) as Facing;
}

// Вид контейнера — только для картинки, на правила не влияет. Ключи хранятся в базе.
export const CONTAINER_LOOKS = ['chest', 'crate', 'barrel', 'sack'] as const;
export type ContainerLook = (typeof CONTAINER_LOOKS)[number];

export const CONTAINER_LOOK_LABELS: Record<ContainerLook, string> = {
  chest: 'Сундук',
  crate: 'Ящик',
  barrel: 'Бочка',
  sack: 'Мешок',
};

// Предмет каталога с количеством — в контейнере и на полу.
export interface ObjectItem {
  itemId: string;
  quantity: number;
}

// Поля по виду. «Существо» в редакторе — это monster или npc: у них разные ссылки,
// и размер НПС лежит на объекте (у персонажа размера нет, docs/dnd/species.md).
export type MapObjectBody =
  | { kind: 'start'; facing: Facing }
  | { kind: 'monster'; monsterId: string; facing: Facing }
  | { kind: 'npc'; characterId: string; size: CreatureSize; facing: Facing }
  | {
      kind: 'container';
      name: string;
      look: ContainerLook;
      items: ObjectItem[];
      // Контейнеры поворачивают с 2026-10-20: у поставленных раньше поля нет, это 0.
      // Не дописываем его при чтении: объект из базы разошёлся бы с записью журнала,
      // и отмена старой правки сочла бы его чужим изменением.
      facing?: Facing;
    }
  | ({ kind: 'item' } & ObjectItem);

export type MapObjectKind = MapObjectBody['kind'];

export const MAP_OBJECT_KINDS: readonly MapObjectKind[] = [
  'start',
  'monster',
  'npc',
  'container',
  'item',
];

export type MapObject = {
  // Номер внутри карты: выдаёт счётчик карты, номера не переиспользуются.
  id: number;
  // Клетка ног; у существа больше Среднего — северо-западная клетка его места.
  at: Vec3;
  // «Скрыт от игроков» (засада, спрятанный сундук): мастер видит его полупрозрачным,
  // игрокам сервер его не отдаёт. Ставится при постановке или updateObject.
  hidden: boolean;
} & MapObjectBody;

// Направление взгляда объекта; null — объект не поворачивают (предмет на полу).
export function objectFacing(object: MapObjectBody): Facing | null {
  if (object.kind === 'item') return null;
  return object.facing ?? 0;
}

// Объекты карты и счётчик номеров. Счётчик только растёт: отмена удаления старого
// объекта вернула бы его под номером, который уже занял новый.
export interface MapObjects {
  byId: Map<number, MapObject>;
  nextId: number;
}

export function createMapObjects(
  objects: MapObject[] = [],
  nextId = 1,
): MapObjects {
  return {
    byId: new Map(objects.map((object) => [object.id, object])),
    nextId,
  };
}

// Сторона квадрата места в клетках: Крошечный занимает одну клетку.
export function footprintCells(size: CreatureSize): number {
  return Math.ceil(CREATURE_SIZES[size].footprint);
}

// Сравнение объектов по содержимому, без учёта порядка полей: объект «до» в журнале
// и объект в базе собраны разным кодом.
export function sameObject(a: MapObject | null, b: MapObject | null): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, field: unknown) =>
    field && typeof field === 'object' && !Array.isArray(field)
      ? Object.fromEntries(
          Object.entries(field).sort(([a], [b]) => a.localeCompare(b)),
        )
      : field,
  );
}
