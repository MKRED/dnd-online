import { asc, eq, inArray } from 'drizzle-orm';
import type { CharacterAbilityEntry } from 'shared';
import { toAbilityVariant } from '../../abilities/abilities.config.js';
import { toCatalogImage } from '../../catalog/catalog-image.mapper.js';
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
type EntryRow = typeof characterAbilities.$inferSelect;
type AbilityRow = typeof abilities.$inferSelect;
type AbilityImageRow = typeof abilityImages.$inferSelect;

// Способность на персонаже глазами смотрящего — по тем же правилам, что эффект
// (character-effects-loader.ts): скрытому от смотрящего не отдаём ничего из карточки,
// скрытая от владельца помечена inactive.
export function toCharacterAbilityEntry(
  entry: EntryRow,
  ability: AbilityRow | null,
  image: AbilityImageRow | null,
  viewerId: string,
  ownerId: string,
): CharacterAbilityEntry {
  const { id, prepared } = entry;
  if (!ability) return { id, prepared, ability: null, missing: 'deleted' };
  const sees = (userId: string) =>
    ability.authorId === userId || ability.isPublic;
  if (!sees(viewerId)) {
    return { id, prepared, ability: null, missing: 'hidden' };
  }
  const fields = toAbilityVariant(
    ability.category,
    ability.details,
    ability.extra,
  );
  return {
    id,
    prepared,
    ability: {
      id: ability.id,
      name: ability.name,
      isPublic: ability.isPublic,
      image: toCatalogImage(image),
      category: fields.category,
      level: fields.category === 'spell' ? fields.details.level : null,
      activation: fields.activation,
      costs: fields.costs,
    },
    missing: null,
    inactive: !sees(ownerId),
  };
}

// Способности нескольких персонажей одним запросом — для списка и листа.
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
    list.push(
      toCharacterAbilityEntry(entry, ability, image, viewerId, ownerId),
    );
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
