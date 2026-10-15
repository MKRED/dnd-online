import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';
import type { EffectDuration } from './effectDuration.js';

// Эффекты (docs/plan/effects.md): общий каталог того, что действует на существо, —
// образцы; наложенный экземпляр появится со связью с персонажем. Поля категории лежат
// в details. Пока есть только «Базовый» — без своих полей; остальное добавляем по
// одному (план, раздел «Порядок работ»).
export const EFFECT_CATEGORIES = ['basic'] as const;
export type EffectCategory = (typeof EFFECT_CATEGORIES)[number];

export type EffectVariant = {
  category: 'basic';
  details: Record<string, never>;
};

// Поля всех эффектов, кроме общих для каталогов.
export interface EffectFields {
  duration: EffectDuration;
}

export type Effect = EffectVariant & EffectFields & CatalogEntryFields;
export type EffectInput = EffectVariant &
  EffectFields &
  CatalogEntryInputFields;
