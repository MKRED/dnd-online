import { BadRequestException } from '@nestjs/common';
import {
  checkFurnitureContainer,
  containerLoad,
  isLockDc,
  loadLabel,
  type FurnitureContainer,
} from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { loadItemRefs } from '../maps/objects/map-object-refs.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SHAPE =
  'Контейнер — {capacity: число фунтов, lockDc: 10, 15, 20 или null, contents: [{itemId, quantity}]}';

// Форма тела контейнера: DTO пропускает объект как есть, поля проверяются здесь.
function isContainerShape(value: unknown): value is FurnitureContainer {
  if (typeof value !== 'object' || value === null) return false;
  const { capacity, lockDc, contents } = value as Record<string, unknown>;
  return (
    typeof capacity === 'number' &&
    (lockDc === null || isLockDc(lockDc)) &&
    Array.isArray(contents) &&
    contents.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).itemId === 'string' &&
        UUID_RE.test((entry as Record<string, string>).itemId) &&
        typeof (entry as Record<string, unknown>).quantity === 'number',
    )
  );
}

// Контейнер обстановки (docs/plan/blocks.md, этап 11): поля, предметы содержимого — свои
// или опубликованные, как в контейнере на карте, — и груз не больше вместимости.
export async function assertFurnitureContainer(
  tx: DbTransaction,
  userId: string,
  container: unknown,
): Promise<void> {
  if (container === null || container === undefined) return;
  if (!isContainerShape(container)) throw new BadRequestException(SHAPE);
  const wrong = checkFurnitureContainer(container);
  if (wrong) throw new BadRequestException(wrong);
  const ids = new Set(container.contents.map((e) => e.itemId.toLowerCase()));
  const { weights } = await loadItemRefs(tx, userId, ids);
  for (const id of ids)
    if (!weights.has(id))
      throw new BadRequestException(`Предмет ${id} не найден в каталоге`);
  const load = containerLoad(
    container.contents,
    (itemId) => weights.get(itemId.toLowerCase()) ?? 0,
  );
  if (load > container.capacity)
    throw new BadRequestException(
      `Содержимое не влезет: ${loadLabel(load, container.capacity)}`,
    );
}
