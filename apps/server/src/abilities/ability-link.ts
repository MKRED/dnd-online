import type { AbilityLink } from 'shared';
import { toCatalogImage } from '../catalog/catalog-image.mapper.js';
import type { abilities, abilityImages } from '../database/schema/index.js';
import { toAbilityVariant } from './abilities.config.js';

type AbilityRow = typeof abilities.$inferSelect;
type AbilityImageRow = typeof abilityImages.$inferSelect;

// Способность на существе (персонаже или монстре) глазами смотрящего — по тем же
// правилам, что эффект (character-effects-loader.ts): скрытому от смотрящего не отдаём
// ничего из карточки, скрытая от владельца существа помечена inactive.
export function toAbilityLink(
  ability: AbilityRow | null,
  image: AbilityImageRow | null,
  viewerId: string,
  ownerId: string,
): AbilityLink {
  if (!ability) return { ability: null, missing: 'deleted' };
  const sees = (userId: string) =>
    ability.authorId === userId || ability.isPublic;
  if (!sees(viewerId)) return { ability: null, missing: 'hidden' };
  const fields = toAbilityVariant(
    ability.category,
    ability.details,
    ability.extra,
  );
  return {
    ability: {
      id: ability.id,
      name: ability.name,
      isPublic: ability.isPublic,
      image: toCatalogImage(image),
      category: fields.category,
      level: fields.category === 'spell' ? fields.details.level : null,
      activation: fields.activation,
      costs: fields.costs,
      recharge: fields.category === 'monster' ? fields.details.recharge : null,
    },
    missing: null,
    inactive: !sees(ownerId),
  };
}
