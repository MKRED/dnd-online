import type { AbilityCosts } from './abilityUsage.js';
import { formatRecharge } from './abilityMonster.js';
import { formatCosts } from './abilityUsageLabels.js';

// «Ограничение» способности монстра (docs/plan/ability-categories.md, вариант 1А): одно поле
// вместо перезарядки и зарядов, как в стат-блоке 2024 (docs/dnd/monsters.md, «Usage
// limits»). Хранение прежнее: «N/день» — заряды «N, после долгого отдыха», «после отдыха» —
// «1, после короткого или долгого», перезарядка — details.recharge.

export const MONSTER_LIMIT_KINDS = [
  'none',
  'per_day',
  'recharge',
  'rest',
] as const;
export type MonsterLimitKind = (typeof MONSTER_LIMIT_KINDS)[number];

export type MonsterLimit =
  | { kind: 'none' }
  | { kind: 'per_day'; amount: number }
  // Нижняя граница броска к6, RECHARGE_MIN–RECHARGE_MAX.
  | { kind: 'recharge'; from: number }
  | { kind: 'rest' };

// Ограничение из хранения; null — заряды в него не укладываются (бонус мастерства,
// «один после короткого», заряды вместе с перезарядкой).
export function monsterLimitOf(
  costs: AbilityCosts,
  recharge: number | null,
): MonsterLimit | null {
  const { uses } = costs;
  if (recharge !== null)
    return uses ? null : { kind: 'recharge', from: recharge };
  if (!uses) return { kind: 'none' };
  if (uses.count.kind !== 'fixed') return null;
  if (uses.recovery === 'long')
    return { kind: 'per_day', amount: uses.count.amount };
  return uses.recovery === 'short' && uses.count.amount === 1
    ? { kind: 'rest' }
    : null;
}

// Ограничение в хранение: заряды затрат и перезарядка в details.
export function monsterLimitStored(limit: MonsterLimit): {
  uses: AbilityCosts['uses'];
  recharge: number | null;
} {
  switch (limit.kind) {
    case 'none':
      return { uses: null, recharge: null };
    case 'per_day':
      return {
        uses: {
          count: { kind: 'fixed', amount: limit.amount },
          recovery: 'long',
        },
        recharge: null,
      };
    case 'recharge':
      return { uses: null, recharge: limit.from };
    case 'rest':
      return {
        uses: { count: { kind: 'fixed', amount: 1 }, recovery: 'short' },
        recharge: null,
      };
  }
}

// Как в книге: «3/день», «Перезарядка 5–6», «Перезарядка после короткого или долгого
// отдыха»; без ограничения — null.
export function formatMonsterLimit(limit: MonsterLimit): string | null {
  switch (limit.kind) {
    case 'none':
      return null;
    case 'per_day':
      return `${limit.amount}/день`;
    case 'recharge':
      return formatRecharge(limit.from);
    case 'rest':
      return 'Перезарядка после короткого или долгого отдыха';
  }
}

// Строки затрат карточки: у «Монстра» сначала «Ограничение», потом остальное. Запись,
// которая в «Ограничение» не укладывается, показана как хранится.
export function formatAbilityCosts(
  category: string,
  costs: AbilityCosts,
  recharge: number | null,
): string[] {
  if (category !== 'monster') return formatCosts(costs);
  const limit = monsterLimitOf(costs, recharge);
  if (!limit) {
    return [
      ...(recharge === null ? [] : [formatRecharge(recharge)]),
      ...formatCosts(costs),
    ];
  }
  const label = formatMonsterLimit(limit);
  return [...(label ? [label] : []), ...formatCosts({ ...costs, uses: null })];
}
