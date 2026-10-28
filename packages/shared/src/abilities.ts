import type { MonsterAbilityDetails } from './abilityMonster.js';
import type { SpellDetails } from './abilitySpell.js';
import type { AbilityFields } from './abilityUsage.js';
import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';

// Способности (docs/plan/done/abilities.md): общий каталог того, что персонаж умеет делать.
// Четыре категории (docs/plan/ability-categories.md): «Базовая» — текст с активацией,
// «Умение» — умение по правилам, «Заклинание», «Монстр». Что каждой можно —
// abilityCategoryRules.ts. Поля категории лежат в details: у «Базовой» и «Умения» своих
// полей нет, у «Заклинания» — круг, школа, компоненты, ритуал и длительность
// (abilitySpell.ts), у «Монстра» — перезарядка (abilityMonster.ts).
export const ABILITY_CATEGORIES = [
  'basic',
  'feature',
  'spell',
  'monster',
] as const;
export type AbilityCategory = (typeof ABILITY_CATEGORIES)[number];

export type AbilityVariant =
  | { category: 'basic'; details: Record<string, never> }
  | { category: 'feature'; details: Record<string, never> }
  | { category: 'spell'; details: SpellDetails }
  | { category: 'monster'; details: MonsterAbilityDetails };

// Активация и затраты — общие поля всех способностей (abilityUsage.ts).
export type Ability = AbilityVariant & AbilityFields & CatalogEntryFields;
export type AbilityInput = AbilityVariant &
  AbilityFields &
  CatalogEntryInputFields;
