import { MapOpError } from '../mapOpError.js';
import type { Fields } from '../opFields.js';
import { CREATURE_SIZES, type CreatureSize } from '../rules/creature.js';
import {
  CONTAINER_LOOKS,
  FACINGS,
  isFacing,
  MAP_OBJECT_KINDS,
  type ContainerLook,
  type Facing,
  type MapObjectKind,
  type ObjectItem,
} from './mapObject.js';

export const OBJECT_NAME_MAX = 100;
export const OBJECT_ITEMS_MAX = 100;
export const OBJECT_QUANTITY_MAX = 9999;

// Поля объекта без вида: из них собирается новый объект, ими же правят существующий.
export interface ObjectFields {
  facing?: Facing;
  monsterId?: string;
  characterId?: string;
  size?: CreatureSize;
  name?: string;
  look?: ContainerLook;
  items?: ObjectItem[];
  itemId?: string;
  quantity?: number;
  // Запись справочника «Обстановка» (этап 8в).
  furnitureId?: string;
  // «Скрыт от игроков» — у объекта любого вида (docs/plan/done/game.md, этап 6).
  hidden?: boolean;
}

// Какие поля есть у какого вида, кроме общих (COMMON_FIELDS).
export const KIND_FIELDS: Record<MapObjectKind, (keyof ObjectFields)[]> = {
  start: ['facing'],
  monster: ['monsterId', 'facing'],
  npc: ['characterId', 'size', 'facing'],
  container: ['name', 'look', 'items', 'facing'],
  item: ['itemId', 'quantity'],
  furniture: ['furnitureId', 'facing'],
};

// Поля, которые есть у объекта любого вида.
export const COMMON_FIELDS: (keyof ObjectFields)[] = ['hidden'];

export function fieldsOfKind(kind: MapObjectKind): (keyof ObjectFields)[] {
  return [...KIND_FIELDS[kind], ...COMMON_FIELDS];
}

const ALL_FIELDS = new Set([
  ...Object.values(KIND_FIELDS).flat(),
  ...COMMON_FIELDS,
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, key: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new MapOpError(`«${key}» должен быть id из каталога (uuid)`);
  }
  return value.toLowerCase();
}

function parseQuantity(value: unknown, key: string): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 1 ||
    (value as number) > OBJECT_QUANTITY_MAX
  ) {
    throw new MapOpError(
      `«${key}» — целое число от 1 до ${OBJECT_QUANTITY_MAX}`,
    );
  }
  return value as number;
}

function parseItems(value: unknown): ObjectItem[] {
  if (!Array.isArray(value)) {
    throw new MapOpError('«items» — список { itemId, quantity }');
  }
  if (value.length > OBJECT_ITEMS_MAX) {
    throw new MapOpError(
      `В контейнере не больше ${OBJECT_ITEMS_MAX} разных предметов`,
    );
  }
  const seen = new Set<string>();
  return value.map((entry: unknown, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new MapOpError(`«items[${index}]» — объект { itemId, quantity }`);
    }
    const fields = entry as Fields;
    const itemId = parseUuid(fields.itemId, `items[${index}].itemId`);
    // Повтор слил бы количества неочевидно — пусть отправитель сложит сам.
    if (seen.has(itemId)) {
      throw new MapOpError(`Предмет ${itemId} в контейнере дважды`);
    }
    seen.add(itemId);
    const quantity =
      fields.quantity === undefined
        ? 1
        : parseQuantity(fields.quantity, `items[${index}].quantity`);
    return { itemId, quantity };
  });
}

function parseName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > OBJECT_NAME_MAX) {
    throw new MapOpError(
      `«name» — непустая строка до ${OBJECT_NAME_MAX} символов`,
    );
  }
  return name;
}

// Разбирает поля объекта из недоверенного JSON. kind — вид нового объекта: поля
// чужого вида отклоняются сразу. Для правки (kind = null) вид известен только при
// применении, там и проверяется, подходят ли поля.
export function parseObjectFields(
  input: Fields,
  kind: MapObjectKind | null,
): ObjectFields {
  if (kind !== null && !MAP_OBJECT_KINDS.includes(kind)) {
    throw new MapOpError(
      `Неизвестный вид объекта: ${String(kind)}. Бывают ${MAP_OBJECT_KINDS.join(', ')}`,
    );
  }
  const allowed = kind ? new Set(fieldsOfKind(kind)) : ALL_FIELDS;
  const parsed: ObjectFields = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'kind' || value === undefined) continue;
    if (!allowed.has(key as keyof ObjectFields)) {
      throw new MapOpError(
        kind
          ? `У объекта «${kind}» нет поля «${key}»`
          : `Неизвестное поле объекта «${key}»`,
      );
    }
    switch (key as keyof ObjectFields) {
      case 'facing':
        if (!isFacing(value)) {
          throw new MapOpError(`«facing» — одно из ${FACINGS.join(', ')}`);
        }
        parsed.facing = value;
        break;
      case 'monsterId':
      case 'characterId':
      case 'itemId':
      case 'furnitureId':
        parsed[key as 'monsterId'] = parseUuid(value, key);
        break;
      case 'size':
        if (typeof value !== 'string' || !(value in CREATURE_SIZES)) {
          throw new MapOpError(
            `«size» — одно из ${Object.keys(CREATURE_SIZES).join(', ')}`,
          );
        }
        parsed.size = value as CreatureSize;
        break;
      case 'name':
        parsed.name = parseName(value);
        break;
      case 'look':
        if (!CONTAINER_LOOKS.includes(value as ContainerLook)) {
          throw new MapOpError(
            `«look» — одно из ${CONTAINER_LOOKS.join(', ')}`,
          );
        }
        parsed.look = value as ContainerLook;
        break;
      case 'items':
        parsed.items = parseItems(value);
        break;
      case 'quantity':
        parsed.quantity = parseQuantity(value, 'quantity');
        break;
      case 'hidden':
        if (typeof value !== 'boolean') {
          throw new MapOpError('«hidden» — true или false');
        }
        parsed.hidden = value;
        break;
    }
  }
  return parsed;
}
