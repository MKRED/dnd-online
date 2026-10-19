import { asc, eq } from 'drizzle-orm';
import type { MonsterEffectEntry } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  effectImages,
  effects,
  monsterEffects,
  monsters,
} from '../../database/schema/index.js';
import { toEffectLink } from '../../effects/effect-link.js';

// Эффекты монстра глазами смотрящего — по общим правилам (toEffectLink); владелец — автор
// монстра. Нужны только карточке, поэтому по одному монстру.
export async function loadMonsterEffects(
  db: Db,
  viewerId: string,
  monsterId: string,
): Promise<MonsterEffectEntry[]> {
  const rows = await db
    .select({
      entry: monsterEffects,
      ownerId: monsters.authorId,
      effect: effects,
      image: effectImages,
    })
    .from(monsterEffects)
    .innerJoin(monsters, eq(monsters.id, monsterEffects.monsterId))
    .leftJoin(effects, eq(effects.id, monsterEffects.effectId))
    .leftJoin(effectImages, eq(effectImages.ownerId, effects.id))
    .where(eq(monsterEffects.monsterId, monsterId))
    // id — тай-брейкер на случай одинакового времени.
    .orderBy(asc(monsterEffects.addedAt), asc(monsterEffects.id));
  return rows.map(({ entry, ownerId, effect, image }) => ({
    id: entry.id,
    ...toEffectLink(effect, image, viewerId, ownerId),
  }));
}
