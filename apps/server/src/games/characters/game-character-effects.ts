import { and, asc, eq, inArray } from 'drizzle-orm';
import type { CharacterEffectEntry } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { toCharacterEffectEntry } from '../../characters/effects/character-effects-loader.js';
import {
  characterEffects,
  effectImages,
  effects,
  gameLibrary,
} from '../../database/schema/index.js';
import { libraryEffectFields } from '../library/library-record.js';

// Эффекты персонажей в игре (docs/plan/done/game.md, «Состояние существ»): из библиотеки игры,
// а не из справочника — правка или скрытие эффекта автором игру не меняет. У копии нет
// автора и видимости, поэтому скрытый эффект мастера на персонаже игрока действует.
// Эффекта нет в библиотеке (владелец наложил его между встречами) — он читается из
// справочника глазами владельца, как в его листе.
//
// Картинки у копии на плашке нет: картинки библиотеки видит только мастер.
export async function loadGameEffectLists(
  db: Db,
  gameId: string,
  owners: ReadonlyMap<string, string>,
): Promise<Map<string, CharacterEffectEntry[]>> {
  const result = new Map<string, CharacterEffectEntry[]>();
  const ids = [...owners.keys()];
  if (ids.length === 0) return result;
  const rows = await db
    .select({
      entry: characterEffects,
      copy: gameLibrary,
      effect: effects,
      image: effectImages,
    })
    .from(characterEffects)
    .leftJoin(
      gameLibrary,
      and(
        eq(gameLibrary.gameId, gameId),
        eq(gameLibrary.kind, 'effect'),
        eq(gameLibrary.sourceId, characterEffects.effectId),
      ),
    )
    .leftJoin(effects, eq(effects.id, characterEffects.effectId))
    .leftJoin(effectImages, eq(effectImages.ownerId, effects.id))
    .where(inArray(characterEffects.characterId, ids))
    .orderBy(asc(characterEffects.addedAt), asc(characterEffects.id));
  for (const { entry, copy, effect, image } of rows) {
    const ownerId = owners.get(entry.characterId) ?? '';
    const list = result.get(entry.characterId) ?? [];
    list.push(
      copy
        ? {
            id: entry.id,
            effect: {
              id: copy.sourceId,
              name: copy.name,
              isPublic: true,
              image: null,
              ...libraryEffectFields(copy),
            },
            missing: null,
            inactive: false,
          }
        : toCharacterEffectEntry(entry, effect, image, ownerId, ownerId),
    );
    result.set(entry.characterId, list);
  }
  return result;
}
