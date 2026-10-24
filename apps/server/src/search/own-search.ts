import { and, eq } from 'drizzle-orm';
import type { CharacterSearchHit, MapSearchHit } from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { byNameMatch, nameContains } from '../catalog/name-match.js';
import { characters, maps } from '../database/schema/index.js';
import { totalCount, type Found, type SearchParams } from './search-params.js';

// Персонажи (с НПС) и карты в поиске — только свои. Персонажа, открытого по ссылке, видит
// тот, у кого ссылка, а не каждый, кто наберёт его имя.

export async function searchCharacters(
  db: Db,
  { userId, q, limit }: SearchParams,
): Promise<Found<CharacterSearchHit>> {
  return db
    .select({
      id: characters.id,
      name: characters.name,
      characterKind: characters.kind,
      classes: characters.classes,
      total: totalCount(),
    })
    .from(characters)
    .where(and(eq(characters.userId, userId), nameContains(characters.name, q)))
    .orderBy(...byNameMatch(characters.name, characters.id, q))
    .limit(limit);
}

export async function searchMaps(
  db: Db,
  { userId, q, limit }: SearchParams,
): Promise<Found<MapSearchHit>> {
  return db
    .select({
      id: maps.id,
      name: maps.name,
      width: maps.width,
      depth: maps.depth,
      total: totalCount(),
    })
    .from(maps)
    .where(and(eq(maps.ownerId, userId), nameContains(maps.name, q)))
    .orderBy(...byNameMatch(maps.name, maps.id, q))
    .limit(limit);
}
