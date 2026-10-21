import { eq } from 'drizzle-orm';
import type { Character } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { loadMainImages } from '../../character-images/character-image-access.js';
import { loadCharacterAbilities } from '../../characters/abilities/index.js';
import { toCharacter } from '../../characters/characters.mapper.js';
import { loadInventory } from '../../characters/inventory/index.js';
import { characters, users } from '../../database/schema/index.js';
import { findSheetLock } from '../sheet-lock.js';
import type { SeatedCharacter } from './game-character-access.js';
import { loadGameEffectLists } from './game-character-effects.js';

// Полный лист персонажа из игры (docs/plan/done/game.md, этап 8): тем, кто его ведёт. Эффекты —
// из библиотеки игры; способности и инвентарь пока глазами владельца, как в его листе:
// читать их из библиотеки — на потом.
export async function readGameCharacter(
  db: Db,
  gameId: string,
  seated: SeatedCharacter,
): Promise<Character> {
  const [found] = await db
    .select({ row: characters, authorNickname: users.nickname })
    .from(characters)
    .innerJoin(users, eq(users.id, characters.userId))
    .where(eq(characters.id, seated.id));
  const { ownerId, id } = seated;
  const images = await loadMainImages(db, [id]);
  const effects = await loadGameEffectLists(
    db,
    gameId,
    new Map([[id, ownerId]]),
  );
  return {
    ...toCharacter(found.row, {
      mainImage: images.get(id) ?? null,
      authorNickname: found.authorNickname,
      inventory: await loadInventory(db, ownerId, id),
      effects: effects.get(id) ?? [],
      abilities: await loadCharacterAbilities(db, ownerId, id),
    }),
    sheetLock: await findSheetLock(db, id),
  };
}
