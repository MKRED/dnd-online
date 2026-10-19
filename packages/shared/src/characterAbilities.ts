import type { AbilityCategory } from './abilities.js';
import type { AbilityActivation, AbilityCosts } from './abilityUsage.js';
import type { CatalogImage } from './catalogImage.js';
import type { CharacterEffectMissing } from './characterEffects.js';

// Способности у персонажа (docs/plan/done/character-abilities.md): строка — ссылка на запись
// каталога, а не копия, как эффект. Правка карточки автором сразу видна у всех.

// Что нужно листу: группа («Умения» по активации, «Заклинания» по кругу) и строка
// затрат. Шаги «Применения» и описание — на карточке способности.
export interface CharacterAbilityCard {
  id: string;
  name: string;
  isPublic: boolean;
  image: CatalogImage | null;
  category: AbilityCategory;
  // Круг заклинания (0 — заговор); у «Базовой» — null.
  level: number | null;
  activation: AbilityActivation;
  costs: AbilityCosts;
}

export type CharacterAbilityEntry = {
  id: string;
  // Подготовлено ли заклинание. Смысл есть только у заклинания 1 круга и выше: у
  // остального лист отметку не показывает, даже если в базе она осталась.
  prepared: boolean;
} & (
  | {
      ability: CharacterAbilityCard;
      missing: null;
      // Способность скрыта от владельца персонажа, но видна смотрящему — её автору на
      // чужом листе (как эффект).
      inactive: boolean;
    }
  | { ability: null; missing: CharacterEffectMissing }
);

export interface CharacterAbilityAddInput {
  abilityId: string;
}

export interface CharacterAbilityUpdateInput {
  prepared: boolean;
}

// Заговоры не готовят, у умений подготовки нет.
export function canBePrepared(
  card: Pick<CharacterAbilityCard, 'category' | 'level'>,
): boolean {
  return card.category === 'spell' && (card.level ?? 0) >= 1;
}
