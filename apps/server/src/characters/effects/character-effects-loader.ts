import { asc, eq, inArray } from 'drizzle-orm';
import type { CharacterEffectEntry } from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import {
  characterEffects,
  characters,
  effectImages,
  effects,
} from '../../database/schema/index.js';
import { toEffectLink } from '../../effects/effect-link.js';

type Db = DatabaseService['db'] | DbTransaction;
type EntryRow = typeof characterEffects.$inferSelect;
type EffectRow = typeof effects.$inferSelect;
type EffectImageRow = typeof effectImages.$inferSelect;

// Эффект на персонаже глазами смотрящего — по общим правилам эффекта на существе
// (toEffectLink).
export function toCharacterEffectEntry(
  entry: EntryRow,
  effect: EffectRow | null,
  image: EffectImageRow | null,
  viewerId: string,
  ownerId: string,
): CharacterEffectEntry {
  return { id: entry.id, ...toEffectLink(effect, image, viewerId, ownerId) };
}

// Эффекты нескольких персонажей одним запросом — для списка и листа.
export async function loadCharacterEffectLists(
  db: Db,
  viewerId: string,
  characterIds: readonly string[],
): Promise<Map<string, CharacterEffectEntry[]>> {
  const result = new Map<string, CharacterEffectEntry[]>();
  if (characterIds.length === 0) return result;
  const rows = await db
    .select({
      entry: characterEffects,
      ownerId: characters.userId,
      effect: effects,
      image: effectImages,
    })
    .from(characterEffects)
    .innerJoin(characters, eq(characters.id, characterEffects.characterId))
    .leftJoin(effects, eq(effects.id, characterEffects.effectId))
    .leftJoin(effectImages, eq(effectImages.ownerId, effects.id))
    .where(inArray(characterEffects.characterId, [...characterIds]))
    // id — тай-брейкер на случай одинакового времени.
    .orderBy(asc(characterEffects.addedAt), asc(characterEffects.id));
  for (const { entry, ownerId, effect, image } of rows) {
    const list = result.get(entry.characterId) ?? [];
    list.push(toCharacterEffectEntry(entry, effect, image, viewerId, ownerId));
    result.set(entry.characterId, list);
  }
  return result;
}

export async function loadCharacterEffects(
  db: Db,
  viewerId: string,
  characterId: string,
): Promise<CharacterEffectEntry[]> {
  const lists = await loadCharacterEffectLists(db, viewerId, [characterId]);
  return lists.get(characterId) ?? [];
}
