import { asc, eq } from 'drizzle-orm';
import type { MonsterAbilityEntry } from 'shared';
import { toAbilityLink } from '../../abilities/ability-link.js';
import type { Db } from '../../catalog/catalog-access.js';
import {
  abilities,
  abilityImages,
  monsterAbilities,
  monsters,
} from '../../database/schema/index.js';

// Способности монстра глазами смотрящего — по общим правилам (toAbilityLink); владелец —
// автор монстра. Нужны только карточке, поэтому по одному монстру.
export async function loadMonsterAbilities(
  db: Db,
  viewerId: string,
  monsterId: string,
): Promise<MonsterAbilityEntry[]> {
  const rows = await db
    .select({
      entry: monsterAbilities,
      ownerId: monsters.authorId,
      ability: abilities,
      image: abilityImages,
    })
    .from(monsterAbilities)
    .innerJoin(monsters, eq(monsters.id, monsterAbilities.monsterId))
    .leftJoin(abilities, eq(abilities.id, monsterAbilities.abilityId))
    .leftJoin(abilityImages, eq(abilityImages.ownerId, abilities.id))
    .where(eq(monsterAbilities.monsterId, monsterId))
    // id — тай-брейкер на случай одинакового времени.
    .orderBy(asc(monsterAbilities.addedAt), asc(monsterAbilities.id));
  return rows.map(({ entry, ownerId, ability, image }) => ({
    id: entry.id,
    perDay: entry.perDay,
    ...toAbilityLink(ability, image, viewerId, ownerId),
  }));
}
