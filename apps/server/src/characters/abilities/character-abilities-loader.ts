import { asc, eq, inArray } from 'drizzle-orm';
import type { CharacterAbilityEntry } from 'shared';
import { toAbilityLink } from '../../abilities/ability-link.js';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import {
  abilities,
  abilityImages,
  characterAbilities,
  characters,
} from '../../database/schema/index.js';

type Db = DatabaseService['db'] | DbTransaction;

// Способности нескольких персонажей одним запросом — для списка и листа. Строка глазами
// смотрящего — по общим правилам (toAbilityLink).
export async function loadCharacterAbilityLists(
  db: Db,
  viewerId: string,
  characterIds: readonly string[],
): Promise<Map<string, CharacterAbilityEntry[]>> {
  const result = new Map<string, CharacterAbilityEntry[]>();
  if (characterIds.length === 0) return result;
  const rows = await db
    .select({
      entry: characterAbilities,
      ownerId: characters.userId,
      ability: abilities,
      image: abilityImages,
    })
    .from(characterAbilities)
    .innerJoin(characters, eq(characters.id, characterAbilities.characterId))
    .leftJoin(abilities, eq(abilities.id, characterAbilities.abilityId))
    .leftJoin(abilityImages, eq(abilityImages.ownerId, abilities.id))
    .where(inArray(characterAbilities.characterId, [...characterIds]))
    // id — тай-брейкер на случай одинакового времени.
    .orderBy(asc(characterAbilities.addedAt), asc(characterAbilities.id));
  for (const { entry, ownerId, ability, image } of rows) {
    const list = result.get(entry.characterId) ?? [];
    list.push({
      id: entry.id,
      prepared: entry.prepared,
      ...toAbilityLink(ability, image, viewerId, ownerId),
    });
    result.set(entry.characterId, list);
  }
  return result;
}

export async function loadCharacterAbilities(
  db: Db,
  viewerId: string,
  characterId: string,
): Promise<CharacterAbilityEntry[]> {
  const lists = await loadCharacterAbilityLists(db, viewerId, [characterId]);
  return lists.get(characterId) ?? [];
}
