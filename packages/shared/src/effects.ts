import type { EffectAbilities } from './abilityStepEffects.js';
import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';
import type { EffectComponent } from './effectComponents.js';
import type { EffectDuration } from './effectDuration.js';
import type { EffectSaveEnds } from './effectSaveEnds.js';

// Эффекты (docs/plan/effects.md): общий каталог того, что действует на существо, —
// образцы; наложенный экземпляр появится со связью с персонажем. Категории у эффекта нет:
// он — список составляющих (effectComponents.ts), пустой список — «Базовый».
export interface EffectFields {
  components: EffectComponent[];
  duration: EffectDuration;
  saveEnds: EffectSaveEnds | null;
}

export type Effect = EffectFields &
  CatalogEntryFields & {
    // Только у автора и только в GET /effects/:id: какие способности его накладывают.
    abilities?: EffectAbilities;
  };
export type EffectInput = EffectFields & CatalogEntryInputFields;
