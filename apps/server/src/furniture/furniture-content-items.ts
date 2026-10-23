import type { FurnitureContainer, ItemRefView } from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { loadItemRefs } from '../maps/objects/map-object-refs.js';

interface WithContents {
  container: FurnitureContainer | null;
  contentItems: Record<string, ItemRefView>;
}

// Предметы содержимого контейнера-обстановки по id (этап 11), как их видит читающий:
// имя, картинка и вес или заглушка «скрыт» и «удалён». Одним запросом на все записи.
export async function attachContentItems(
  db: Db,
  userId: string,
  entries: WithContents[],
): Promise<void> {
  const ids = new Set(
    entries.flatMap((e) => e.container?.contents.map((c) => c.itemId) ?? []),
  );
  if (!ids.size) return;
  const { view } = await loadItemRefs(db, userId, ids);
  for (const entry of entries)
    for (const { itemId } of entry.container?.contents ?? [])
      entry.contentItems[itemId] = view[itemId];
}
