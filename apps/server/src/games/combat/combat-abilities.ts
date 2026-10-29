import { and, eq } from 'drizzle-orm';
import type { Character, Monster } from 'shared';
import { loadCharacterAbilities } from '../../characters/abilities/index.js';
import type { DbTransaction } from '../../database/database.service.js';
import { gameSceneObjects } from '../../database/schema/index.js';
import { findLibraryRow, readLibraryEntry } from '../library/library-read.js';
import type { LiveCombatant } from './combatant-read.js';

// Способности участника боя (этап 4): у героя — его способности, как на листе в игре; у НПС
// и монстра — из их копии в библиотеке игры. Строка — связь с каталогом: prepared есть
// только у персонажа и НПС.

export interface CombatantAbility {
  id: string;
  prepared: boolean | null;
  ability: NonNullable<Character['abilities'][number]['ability']>;
}

export async function combatantAbilities(
  tx: DbTransaction,
  gameId: string,
  viewerId: string,
  c: LiveCombatant,
): Promise<CombatantAbility[]> {
  if (c.figure && c.ref.kind === 'figure') {
    const entries = await loadCharacterAbilities(
      tx,
      c.figure.ownerId,
      c.ref.characterId,
    );
    return entries.flatMap((e) =>
      e.ability ? [{ id: e.id, prepared: e.prepared, ability: e.ability }] : [],
    );
  }
  const objectId = c.creature!.objectId;
  const [object] = await tx
    .select()
    .from(gameSceneObjects)
    .where(
      and(
        eq(gameSceneObjects.sceneId, c.row.sceneId),
        eq(gameSceneObjects.id, objectId),
      ),
    );
  const npc = object?.kind === 'npc';
  const row =
    object &&
    (await findLibraryRow(tx, gameId, {
      kind: npc ? 'npc' : 'monster',
      sourceId: String(
        npc ? object.fields.characterId : object.fields.monsterId,
      ),
    }));
  if (!row) return [];
  const { record } = await readLibraryEntry(tx, row, viewerId);
  if (npc) {
    return (record as Character).abilities.flatMap((e) =>
      e.ability ? [{ id: e.id, prepared: e.prepared, ability: e.ability }] : [],
    );
  }
  return ((record as Monster).abilities ?? []).flatMap((e) =>
    e.ability ? [{ id: e.id, prepared: null, ability: e.ability }] : [],
  );
}
