import type { MapInfo, MapSize } from 'shared';
import type { maps } from '../database/schema/index.js';

export function sizeOf(row: typeof maps.$inferSelect): MapSize {
  return { width: row.width, depth: row.depth };
}

export function toMapInfo(row: typeof maps.$inferSelect): MapInfo {
  return {
    id: row.id,
    name: row.name,
    seq: row.seq,
    width: row.width,
    depth: row.depth,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
