import type { MapInfo } from 'shared';
import type { maps } from '../database/schema/index.js';

export function toMapInfo(row: typeof maps.$inferSelect): MapInfo {
  return {
    id: row.id,
    name: row.name,
    seq: row.seq,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
