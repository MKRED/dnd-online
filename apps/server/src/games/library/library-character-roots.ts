import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import type { GameLibraryRef } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  characterAbilities,
  characterEffects,
  characterItems,
  characters,
  gameMembers,
} from '../../database/schema/index.js';

// Что из листов персонажей на местах идёт в библиотеку в начале встречи: предметы,
// способности и эффекты. По владельцу — копируется то, что видит он (docs/plan/game.md,
// этап 4).
export async function seatedCharacterRoots(
  tx: DbTransaction,
  gameId: string,
): Promise<Map<string, GameLibraryRef[]>> {
  const seated = await tx
    .select({ id: characters.id, ownerId: characters.userId })
    .from(gameMembers)
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(eq(gameMembers.gameId, gameId));
  const roots = new Map<string, GameLibraryRef[]>();
  if (seated.length === 0) return roots;
  const ownerOf = new Map(seated.map((row) => [row.id, row.ownerId]));
  const ids = [...ownerOf.keys()];
  const add = (characterId: string, ref: GameLibraryRef) => {
    const ownerId = ownerOf.get(characterId);
    if (!ownerId) return;
    const list = roots.get(ownerId) ?? [];
    list.push(ref);
    roots.set(ownerId, list);
  };

  // Строки удалённых записей (null) копировать нечего. Запросы — по очереди: у
  // транзакции одно соединение.
  const itemRows = await tx
    .select({
      characterId: characterItems.characterId,
      sourceId: characterItems.itemId,
    })
    .from(characterItems)
    .where(
      and(
        inArray(characterItems.characterId, ids),
        isNotNull(characterItems.itemId),
      ),
    );
  const abilityRows = await tx
    .select({
      characterId: characterAbilities.characterId,
      sourceId: characterAbilities.abilityId,
    })
    .from(characterAbilities)
    .where(
      and(
        inArray(characterAbilities.characterId, ids),
        isNotNull(characterAbilities.abilityId),
      ),
    );
  const effectRows = await tx
    .select({
      characterId: characterEffects.characterId,
      sourceId: characterEffects.effectId,
    })
    .from(characterEffects)
    .where(
      and(
        inArray(characterEffects.characterId, ids),
        isNotNull(characterEffects.effectId),
      ),
    );
  for (const row of itemRows)
    if (row.sourceId)
      add(row.characterId, { kind: 'item', sourceId: row.sourceId });
  for (const row of abilityRows)
    if (row.sourceId)
      add(row.characterId, { kind: 'ability', sourceId: row.sourceId });
  for (const row of effectRows)
    if (row.sourceId)
      add(row.characterId, { kind: 'effect', sourceId: row.sourceId });
  return roots;
}
