import type { SpellDetails } from './abilitySpell.js';
import type { AbilityFields } from './abilityUsage.js';
import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';

// Способности (docs/plan/abilities.md): общий каталог того, что персонаж умеет делать.
// Поля категории лежат в details: у «Базовой» своих полей нет, у «Заклинания» — круг,
// школа, компоненты, ритуал и длительность (abilitySpell.ts).
export const ABILITY_CATEGORIES = ['basic', 'spell'] as const;
export type AbilityCategory = (typeof ABILITY_CATEGORIES)[number];

export type AbilityVariant =
  | { category: 'basic'; details: Record<string, never> }
  | { category: 'spell'; details: SpellDetails };

// Активация и затраты — общие поля всех способностей (abilityUsage.ts).
export type Ability = AbilityVariant & AbilityFields & CatalogEntryFields;
export type AbilityInput = AbilityVariant &
  AbilityFields &
  CatalogEntryInputFields;
