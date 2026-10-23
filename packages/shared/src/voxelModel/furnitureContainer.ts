import type { ObjectItem } from '../map/objects/mapObject.js';
import {
  OBJECT_ITEMS_MAX,
  OBJECT_QUANTITY_MAX,
} from '../map/objects/objectFields.js';

// Контейнер — вид обстановки (docs/plan/blocks.md, этап 11): вместимость в фунтах (правило
// дома, docs/dnd/items.md), Сл взлома замка (DMG 2024, docs/dnd/doors.md; null — замка
// нет) и содержимое, с которым он ставится на карту.
export const LOCK_DCS = [10, 15, 20] as const;
export type LockDc = (typeof LOCK_DCS)[number];

export const LOCK_DC_LABELS: Record<LockDc, string> = {
  10: 'Плохой замок (Сл 10)',
  15: 'Хороший замок (Сл 15)',
  20: 'Отличный замок (Сл 20)',
};

export const CONTAINER_CAPACITY_MAX = 10_000;

export interface FurnitureContainer {
  capacity: number;
  lockDc: LockDc | null;
  contents: ObjectItem[];
}

export const isLockDc = (value: unknown): value is LockDc =>
  LOCK_DCS.includes(value as LockDc);

// Что не так с контейнером — для сервера (400) и формы; null — всё в порядке. Груз
// содержимого против вместимости проверяет сервер: ему известны веса предметов.
export function checkFurnitureContainer(
  container: FurnitureContainer,
): string | null {
  const { capacity, lockDc, contents } = container;
  if (
    typeof capacity !== 'number' ||
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    capacity > CONTAINER_CAPACITY_MAX ||
    Math.round(capacity * 100) !== capacity * 100
  )
    return `Вместимость — от 0,01 до ${CONTAINER_CAPACITY_MAX} фнт., до сотых`;
  if (lockDc !== null && !isLockDc(lockDc))
    return 'Сл взлома — 10, 15, 20 или без замка';
  if (contents.length > OBJECT_ITEMS_MAX)
    return `В контейнере не больше ${OBJECT_ITEMS_MAX} разных предметов`;
  const seen = new Set<string>();
  for (const { itemId, quantity } of contents) {
    if (seen.has(itemId)) return 'Предмет в содержимом дважды';
    seen.add(itemId);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > OBJECT_QUANTITY_MAX
    )
      return `Количество — от 1 до ${OBJECT_QUANTITY_MAX}`;
  }
  return null;
}

const isObjectItem = (value: unknown): value is ObjectItem =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ObjectItem).itemId === 'string' &&
  Number.isInteger((value as ObjectItem).quantity);

// Контейнер из записи в базе: не контейнер или испорченный — обычная обстановка.
export function readFurnitureContainer(
  value: unknown,
): FurnitureContainer | null {
  if (typeof value !== 'object' || value === null) return null;
  const { capacity, lockDc, contents } = value as Record<string, unknown>;
  if (typeof capacity !== 'number') return null;
  return {
    capacity,
    lockDc: isLockDc(lockDc) ? lockDc : null,
    contents: Array.isArray(contents)
      ? contents
          .filter(isObjectItem)
          .map(({ itemId, quantity }) => ({ itemId, quantity }))
      : [],
  };
}
