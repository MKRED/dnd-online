import type { AbilityLink } from '../abilityLinks.js';
import { traitEffects } from '../abilityPassive.js';
import type { EffectLink } from '../characterEffects.js';
import { expandConditions } from '../conditionsExpand.js';
import { CONDITION_LABELS, type ConditionKind } from '../effectConditions.js';
import type { AppliedEffect } from '../effectSpeedTotal.js';
import { conditionOf } from '../sheetConditions.js';
import { activeEffects } from '../sheetTotals.js';

// Существо в бою глазами правил атаки: его эффекты (с чертами) и как их называть в
// причинах преимущества и помехи.
export interface FighterEffects {
  effects: readonly AppliedEffect[];
  nameOf: (source: string) => string;
}

// Состояния, которые на существе действуют: с теми, что включены другими, и без тех, к
// которым у него иммунитет (conditionsExpand.ts).
export function fighterConditions(
  effects: readonly AppliedEffect[],
): Set<ConditionKind> {
  return new Set(
    expandConditions(effects).flatMap((e) => conditionOf(e.source) ?? []),
  );
}

// Одно заклинание дважды не складывается (docs/dnd/combining-effects.md): от источника
// берётся последний экземпляр — как у инициативы.
export function effectsBySource(
  effects: readonly AppliedEffect[],
): AppliedEffect[] {
  const bySource = new Map<string, AppliedEffect>();
  for (const effect of expandConditions(effects)) {
    bySource.set(effect.source, effect);
  }
  return [...bySource.values()];
}

// Герой на 0 хитов Без сознания (Rules Glossary 2024, Unconscious; docs/dnd/hit-points.md):
// на листе такого эффекта нет, правила атаки добавляют его сами.
export const ZERO_HP_SOURCE = 'zero-hit-points';
export const ZERO_HP_LABEL = '0 хитов';
export const zeroHitPointsEffect: AppliedEffect = {
  source: ZERO_HP_SOURCE,
  components: [{ kind: 'condition', condition: 'unconscious' }],
};

type EffectEntry = { id: string } & EffectLink;
type AbilityEntry = { id: string } & AbilityLink;

// Эффекты существа в бою — как их считает итог листа или карточки (sheetTotals.ts): черты
// и действующие эффекты, с их названиями и названиями состояний.
export function fighterEffectsOf(
  entries: readonly EffectEntry[],
  abilities: readonly AbilityEntry[],
  extra: readonly AppliedEffect[] = [],
): FighterEffects {
  const traits = traitEffects(abilities);
  const names = new Map<string, string>([
    ...traits.map(({ source, name }) => [source, name] as const),
    ...entries.flatMap((e) =>
      e.effect ? [[e.effect.id, e.effect.name] as const] : [],
    ),
    [ZERO_HP_SOURCE, ZERO_HP_LABEL],
  ]);
  return {
    effects: [...traits, ...activeEffects(entries), ...extra],
    nameOf: (source) => {
      const kind = conditionOf(source);
      return kind ? CONDITION_LABELS[kind] : (names.get(source) ?? source);
    },
  };
}
