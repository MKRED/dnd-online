import {
  GROWTH_CHARACTER_LEVELS,
  hasGrowth,
  type GrowthBasis,
} from './abilityStepGrowth.js';
import { formatDamagePart } from './abilityStepLabels.js';
import type { StepGrowth } from './abilitySteps.js';

// Рост шага для формы и карточки (этап 7).

const [L5, L11, L17] = GROWTH_CHARACTER_LEVELS;

// Заголовок блока «Рост» в форме; у заклинания без ячейки его заменяет подсказка.
export function formatGrowthBasis(basis: GrowthBasis): string {
  switch (basis.kind) {
    case 'slot':
      return `За каждый круг ячейки выше ${basis.above}`;
    case 'level':
      return `На ${L5}, ${L11} и ${L17} уровне персонажа`;
    case 'none':
      return 'Без ячейки заклинание не растёт';
  }
}

// GROWTH_TIMES_MAX — 3, так что формы «повторов» не нужно.
const repeats = (times: number) =>
  `+${times} ${times === 1 ? 'повтор' : 'повтора'}`;

// «Рост за каждый круг ячейки выше 3: +1d6 Огонь, +1 повтор». null — шаг не растёт или
// рост не действует (заклинание без ячейки).
export function formatStepGrowth(
  growth: StepGrowth,
  basis: GrowthBasis,
): string | null {
  if (!hasGrowth(growth) || basis.kind === 'none') return null;
  const parts = [
    ...growth.damage.map((part) => `+${formatDamagePart(part)}`),
    ...(growth.times > 0 ? [repeats(growth.times)] : []),
  ];
  const when =
    basis.kind === 'slot'
      ? `за каждый круг ячейки выше ${basis.above}`
      : `на ${L5}, ${L11} и ${L17} уровне`;
  return `Рост ${when}: ${parts.join(', ')}`;
}
