import type { AbilityCategory } from './abilities.js';
import type { AbilityActivation, AbilityCosts } from './abilityUsage.js';
import type { CatalogImage } from './catalogImage.js';
import type { CharacterEffectMissing } from './characterEffects.js';

// Способность каталога на существе — у персонажа (docs/plan/done/character-abilities.md) и у
// монстра (docs/plan/monsters-npcs.md): строка — ссылка на запись каталога, а не копия.
// Правка карточки автором сразу видна у всех.

// Что нужно листу и карточке монстра: группа («Умения» по активации, «Заклинания» по кругу
// или частоте) и строка затрат. Шаги «Применения» и описание — на карточке способности.
export interface AbilityLinkCard {
  id: string;
  name: string;
  isPublic: boolean;
  image: CatalogImage | null;
  category: AbilityCategory;
  // Круг заклинания (0 — заговор); у остальных категорий — null.
  level: number | null;
  activation: AbilityActivation;
  costs: AbilityCosts;
  // «Перезарядка X–6» способности «Монстра»; у остальных категорий — null.
  recharge: number | null;
}

// Карточка глазами смотрящего: скрытое от него и удалённое — заглушка без полей карточки.
export type AbilityLink =
  | {
      ability: AbilityLinkCard;
      missing: null;
      // Способность скрыта от владельца существа, но видна смотрящему — её автору на
      // чужом листе (как эффект).
      inactive: boolean;
    }
  | { ability: null; missing: CharacterEffectMissing };
