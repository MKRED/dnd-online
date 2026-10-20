import { asc, inArray } from 'drizzle-orm';
import type { GameLibraryKind } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  abilityStepEffects,
  itemPackEntries,
  monsterAbilities,
  monsterEffects,
  monsterItems,
} from '../../database/schema/index.js';
import {
  emptyLinks,
  type AbilityLinks,
  type ItemLinks,
  type LibraryLinks,
  type MonsterLinks,
} from './library-links.js';

// Связи записей справочника в форме копии (library-links.ts) — по нескольким записям
// одного вида сразу. Порядок — как в карточке справочника.
export async function loadSourceLinks<K extends GameLibraryKind>(
  db: Db,
  kind: K,
  ids: readonly string[],
): Promise<Map<string, LibraryLinks[K]>> {
  const result = new Map<string, LibraryLinks[K]>(
    ids.map((id) => [id, emptyLinks(kind)]),
  );
  if (ids.length === 0) return result;
  const of = (id: string) => result.get(id) as LibraryLinks[K];
  if (kind === 'monster')
    await loadMonsterLinks(db, ids, (id) => of(id) as MonsterLinks);
  if (kind === 'ability')
    await loadAbilityLinks(db, ids, (id) => of(id) as AbilityLinks);
  if (kind === 'item')
    await loadPackLinks(db, ids, (id) => of(id) as ItemLinks);
  return result;
}

async function loadMonsterLinks(
  db: Db,
  ids: readonly string[],
  of: (id: string) => MonsterLinks,
) {
  // По очереди: в транзакции у запросов одно соединение.
  const abilityRows = await db
    .select()
    .from(monsterAbilities)
    .where(inArray(monsterAbilities.monsterId, [...ids]))
    .orderBy(asc(monsterAbilities.addedAt), asc(monsterAbilities.id));
  const itemRows = await db
    .select()
    .from(monsterItems)
    .where(inArray(monsterItems.monsterId, [...ids]))
    .orderBy(asc(monsterItems.addedAt), asc(monsterItems.id));
  const effectRows = await db
    .select()
    .from(monsterEffects)
    .where(inArray(monsterEffects.monsterId, [...ids]))
    .orderBy(asc(monsterEffects.addedAt), asc(monsterEffects.id));
  for (const row of abilityRows)
    of(row.monsterId).abilities.push({
      sourceId: row.abilityId,
      perDay: row.perDay,
    });
  for (const row of itemRows)
    of(row.monsterId).items.push({
      sourceId: row.itemId,
      quantity: row.quantity,
    });
  for (const row of effectRows)
    of(row.monsterId).effects.push({ sourceId: row.effectId });
}

async function loadAbilityLinks(
  db: Db,
  ids: readonly string[],
  of: (id: string) => AbilityLinks,
) {
  const rows = await db
    .select()
    .from(abilityStepEffects)
    .where(inArray(abilityStepEffects.abilityId, [...ids]))
    .orderBy(
      asc(abilityStepEffects.step),
      asc(abilityStepEffects.outcome),
      asc(abilityStepEffects.position),
    );
  for (const row of rows) {
    // Исход проверяет check в базе; сужение — для типа.
    if (row.outcome !== 'hit' && row.outcome !== 'miss') continue;
    of(row.abilityId).stepEffects.push({
      step: row.step,
      outcome: row.outcome,
      sourceId: row.effectId,
    });
  }
}

async function loadPackLinks(
  db: Db,
  ids: readonly string[],
  of: (id: string) => ItemLinks,
) {
  const rows = await db
    .select()
    .from(itemPackEntries)
    .where(inArray(itemPackEntries.packId, [...ids]))
    .orderBy(asc(itemPackEntries.position));
  for (const row of rows)
    of(row.packId).pack.push({ sourceId: row.itemId, quantity: row.quantity });
}
