import { inArray } from 'drizzle-orm';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogOrigin } from 'shared';
import type { DatabaseService } from '../../database/database.service.js';
import type { CatalogEntryTable } from '../../database/schema/index.js';
import { catalogVersion } from './catalog-version.js';

// У копий — виден ли оригинал тому, кто читает, и другие ли у него теперь вид и
// свойства, чем взяты в копию (docs/plan/blocks.md, этап 6б). Скрытый или удалённый
// оригинал — «недоступен», сама копия при этом не меняется. Меняет записи на месте.
export async function attachOrigins(
  databaseService: DatabaseService,
  table: CatalogEntryTable,
  logger: PinoLogger,
  userId: string,
  entries: { origin: CatalogOrigin | null }[],
): Promise<void> {
  const copies = entries.filter((entry) => entry.origin);
  if (!copies.length) return;
  const t0 = Date.now();
  const ids = [...new Set(copies.map((entry) => entry.origin!.id))];
  const originals = await databaseService.db
    .select({
      id: table.id,
      authorId: table.authorId,
      isPublic: table.isPublic,
      details: table.details,
      extra: table.extra,
    })
    .from(table)
    .where(inArray(table.id, ids));
  const byId = new Map(originals.map((row) => [row.id, row]));
  for (const entry of copies) {
    const origin = entry.origin!;
    const row = byId.get(origin.id);
    origin.available = Boolean(
      row && (row.isPublic || row.authorId === userId),
    );
    origin.updated =
      origin.available && catalogVersion(row!) !== origin.version;
  }
  logger.debug(
    {
      durationMs: Date.now() - t0,
      copies: copies.length,
      found: originals.length,
    },
    'Catalog origins attached',
  );
}
