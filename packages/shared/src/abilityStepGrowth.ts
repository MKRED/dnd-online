import type { AbilityVariant } from './abilities.js';
import type { StepGrowth } from './abilitySteps.js';
import type { AbilityCosts } from './abilityUsage.js';

// С чем растёт шаг (docs/plan/abilities.md, этап 7; правила — docs/dnd/spells.md,
// «Growth»). Не хранится — решает способность, поэтому смена категории, круга или
// затрат не портит шаг, меняется только подпись:
// - есть затрата «Ячейка заклинаний N круга или выше» — за каждый круг ячейки выше N
//   («Огненный шар»; «Мистическая кара» колдуна — не заклинание, но тратит ячейку);
// - заклинание 1 круга и выше без ячейки (копия от черты) не растёт: его сотворяют его
//   кругом;
// - иначе — на 5, 11 и 17 уровне персонажа (заговоры, оружие дыхания).
export type GrowthBasis =
  { kind: 'slot'; above: number } | { kind: 'level' } | { kind: 'none' };

export const GROWTH_CHARACTER_LEVELS = [5, 11, 17] as const;

export const NO_STEP_GROWTH: StepGrowth = { damage: [], times: 0 };

export const hasGrowth = (growth: StepGrowth) =>
  growth.damage.length > 0 || growth.times > 0;

export function growthBasis(
  variant: AbilityVariant,
  costs: AbilityCosts,
): GrowthBasis {
  if (costs.spellSlot) return { kind: 'slot', above: costs.spellSlot.minLevel };
  if (variant.category === 'spell' && variant.details.level >= 1)
    return { kind: 'none' };
  return { kind: 'level' };
}
