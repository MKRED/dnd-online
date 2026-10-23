import {
  CREATURE_SIZES,
  type CreatureSize,
  type MapCatalogEntry,
} from 'shared';
import type { CatalogChoice } from './objectPlacement';

export type CatalogKind = CatalogChoice['kind'];

// Найденная запись каталога для постановки с её видом (GET /map-catalog).
export interface CatalogFound extends MapCatalogEntry {
  kind: CatalogKind;
}

const MOUNT_SHORT: Record<string, string> = {
  floor: 'на полу',
  wall: 'на стене',
  ceiling: 'на потолке',
  doorway: 'в проёме',
};

const isSize = (size: string | undefined): size is CreatureSize =>
  size !== undefined && size in CREATURE_SIZES;

// Подпись записи в поиске: имя, у монстра — размер и «уникальный», у обстановки — размер
// модели «ширина×глубина×высота» и крепление.
export function catalogLabel(entry: CatalogFound): string {
  const parts = [entry.name];
  if (isSize(entry.size)) parts.push(CREATURE_SIZES[entry.size].label);
  if (entry.role === 'unique') parts.push('уникальный');
  if (entry.modelSize) {
    const [x, y, z] = entry.modelSize;
    parts.push(`${x}×${z}×${y}`);
  }
  if (entry.mount) parts.push(MOUNT_SHORT[entry.mount] ?? entry.mount);
  return parts.join(' · ');
}

// Найденная запись — выбор для постановки: размер места у монстра, модели у обстановки.
export const toCatalogChoice = (entry: CatalogFound): CatalogChoice => ({
  kind: entry.kind,
  id: entry.id,
  name: entry.name,
  label: catalogLabel(entry),
  ...(isSize(entry.size) && { size: entry.size }),
  ...(entry.weight !== undefined && { weight: entry.weight }),
  ...(entry.modelSize?.length === 3 && {
    modelSize: entry.modelSize as unknown as [number, number, number],
  }),
});
