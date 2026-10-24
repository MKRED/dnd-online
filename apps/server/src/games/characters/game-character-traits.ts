import type { CharacterAbilityEntry } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { loadCharacterAbilityLists } from '../../characters/abilities/index.js';

// Черты персонажей в игре (docs/plan/done/traits.md): способности листа из справочника
// глазами владельца, как в листе в игре (game-character-read.ts). Владелец у каждого свой,
// поэтому запрос — на каждого владельца: что на персонажа действует, решает видимость для
// владельца, а не для смотрящего.
export async function loadGameTraitLists(
  db: Db,
  owners: ReadonlyMap<string, string>,
): Promise<Map<string, CharacterAbilityEntry[]>> {
  const byOwner = new Map<string, string[]>();
  for (const [characterId, ownerId] of owners) {
    byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), characterId]);
  }
  const result = new Map<string, CharacterAbilityEntry[]>();
  for (const [ownerId, ids] of byOwner) {
    const lists = await loadCharacterAbilityLists(db, ownerId, ids);
    for (const [id, list] of lists) result.set(id, list);
  }
  return result;
}
