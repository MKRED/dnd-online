import { OUTCOME_LABELS } from './abilityStepLabels.js';
import type { AbilityStep } from './abilitySteps.js';
import type { StepEffect } from './abilityStepEffects.js';

// Эффекты шага для карточки: подпись исхода и его эффекты. Строкой их не собрать — в
// карточке название эффекта ссылка, поэтому строку рисует интерфейс.
export interface StepEffectOutcome {
  // «Попадание, эффект», «Успех, эффекты»; без проверки — «Эффект».
  label: string;
  effects: StepEffect[];
}

export function stepEffectOutcomes(step: AbilityStep): StepEffectOutcome[] {
  const labels = OUTCOME_LABELS[step.check.kind];
  // «Попадание, эффект», а не «Попадание»: строка урона с той же подписью стоит выше.
  const label = (outcome: string | null, effects: StepEffect[]) => {
    const noun = effects.length > 1 ? 'эффекты' : 'эффект';
    return outcome
      ? `${outcome}, ${noun}`
      : noun[0].toUpperCase() + noun.slice(1);
  };
  const outcomes: StepEffectOutcome[] = [];
  const { hit, miss } = step;
  if (hit.effects.length > 0)
    outcomes.push({
      label: label(labels.miss === null ? null : labels.hit, hit.effects),
      effects: hit.effects,
    });
  if (labels.miss !== null && miss.effects.length > 0)
    outcomes.push({
      label: label(labels.miss, miss.effects),
      effects: miss.effects,
    });
  return outcomes;
}
