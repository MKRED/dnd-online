import type { EffectLink } from 'shared';
import { toCatalogImage } from '../catalog/catalog-image.mapper.js';
import type { effectImages, effects } from '../database/schema/index.js';
import { toEffectFields } from './effects.config.js';

type EffectRow = typeof effects.$inferSelect;
type EffectImageRow = typeof effectImages.$inferSelect;

// Эффект на существе (персонаже или монстре) глазами смотрящего — по тем же правилам, что
// предмет в инвентаре (docs/plan/done/character-inventory.md, «Ссылка, а не копия»):
// - скрытому от смотрящего не отдаём ничего из карточки;
// - скрытый от владельца на существо не действует: автор эффекта на чужом листе видит
//   свою карточку, но строка помечена inactive.
export function toEffectLink(
  effect: EffectRow | null,
  image: EffectImageRow | null,
  viewerId: string,
  ownerId: string,
): EffectLink {
  if (!effect) return { effect: null, missing: 'deleted' };
  const sees = (userId: string) =>
    effect.authorId === userId || effect.isPublic;
  if (!sees(viewerId)) return { effect: null, missing: 'hidden' };
  return {
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
