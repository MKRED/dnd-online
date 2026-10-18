import { asc, eq, inArray } from 'drizzle-orm';
import type { CharacterEffectEntry } from 'shared';
import { toCatalogImage } from '../../catalog/catalog-image.mapper.js';
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
import { toEffectFields } from '../../effects/effects.config.js';

type Db = DatabaseService['db'] | DbTransaction;
type EntryRow = typeof characterEffects.$inferSelect;
type EffectRow = typeof effects.$inferSelect;
type EffectImageRow = typeof effectImages.$inferSelect;

// Эффект на персонаже глазами смотрящего — по тем же правилам, что предмет в инвентаре
// (docs/plan/done/character-inventory.md, «Ссылка, а не копия»):
// - скрытому от смотрящего не отдаём ничего из карточки;
// - скрытый от владельца на персонажа не действует: автор эффекта на чужом листе видит
//   свою карточку, но строка помечена inactive.
export function toCharacterEffectEntry(
  entry: EntryRow,
  effect: EffectRow | null,
  image: EffectImageRow | null,
  viewerId: string,
  ownerId: string,
): CharacterEffectEntry {
  if (!effect) return { id: entry.id, effect: null, missing: 'deleted' };
  const sees = (userId: string) =>
    effect.authorId === userId || effect.isPublic;
  if (!sees(viewerId)) return { id: entry.id, effect: null, missing: 'hidden' };
  return {
    id: entry.id,
    effect: {
      id: effect.id,
      name: effect.name,
      isPublic: effect.isPublic,
      image: toCatalogImage(image),
      ...toEffectFields(effect.category, effect.details, effect.extra),
    },
    missing: null,
    inactive: !sees(ownerId),
  };
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
