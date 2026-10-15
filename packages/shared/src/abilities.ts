import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';

// Способности (docs/plan/abilities.md): общий каталог того, что персонаж умеет делать.
// Поля категории лежат в details. Пока есть только «Базовая» — без своих полей;
// остальные добавляем по одной (план, раздел «Категории»).
export const ABILITY_CATEGORIES = ['basic'] as const;
export type AbilityCategory = (typeof ABILITY_CATEGORIES)[number];

export type AbilityVariant = {
  category: 'basic';
  details: Record<string, never>;
};

export type Ability = AbilityVariant & CatalogEntryFields;
export type AbilityInput = AbilityVariant & CatalogEntryInputFields;
