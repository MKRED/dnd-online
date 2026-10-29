import type { AbilityCategory, AbilityVariant } from './abilities.js';
import type {
  AbilityActivation,
  AbilityActivationKind,
  AbilityFields,
} from './abilityUsage.js';
import { monsterLimitOf } from './monsterAbilityLimit.js';

// Что можно каждой категории способности (docs/plan/ability-categories.md, решение Михаила
// 2026-10-28): какие активации, какие затраты, есть ли «Применение» и составляющие черты.
// Форма показывает только разрешённое, сервер отклоняет остальное.

// Время сотворения в 2024: действие, бонусное действие, реакция или минуты и часы
// (docs/dnd/ability-usage.md). «Без действия» и «Вместо одной атаки» у заклинаний не бывает.
const SPELL_ACTIVATION_KINDS: readonly AbilityActivationKind[] = [
  'action',
  'bonus_action',
  'reaction',
  'time',
];

// Категории, у которых бывает черта. У заклинания её нет: заклинание сотворяют.
export const TRAIT_CATEGORIES = [
  'basic',
  'feature',
  'monster',
] as const satisfies readonly AbilityCategory[];

export function activationKindFitsCategory(
  category: AbilityCategory,
  kind: AbilityActivationKind,
): boolean {
  if (category === 'spell') return SPELL_ACTIVATION_KINDS.includes(kind);
  return kind !== 'legendary' || category === 'monster';
}

export const activationFitsCategory = (
  category: AbilityCategory,
  activation: AbilityActivation,
) => activationKindFitsCategory(category, activation.kind);

export const ABILITY_COST_KINDS = [
  'uses',
  'spellSlot',
  'movement',
  'hitDie',
] as const;
export type AbilityCostKind = (typeof ABILITY_COST_KINDS)[number];

// Какие затраты можно отметить. У черты и «Базовой» их нет; монстр не тратит ячеек и
// костей хитов, его заряды — «Ограничение» (monsterAbilityLimit.ts); заклинание не тратит
// кость хитов.
export function allowedCostKinds(
  category: AbilityCategory,
  activation: AbilityActivationKind,
): readonly AbilityCostKind[] {
  if (activation === 'trait') return [];
  switch (category) {
    case 'basic':
      return [];
    case 'feature':
      return ABILITY_COST_KINDS;
    case 'spell':
      return ['uses', 'spellSlot', 'movement'];
    case 'monster':
      return ['uses', 'movement'];
  }
}

// «Применение» и составляющие черты — правила; у «Базовой», которая только текст, их нет.
export const hasRules = (category: AbilityCategory) => category !== 'basic';

type RuleFields = AbilityVariant &
  Pick<AbilityFields, 'activation' | 'costs' | 'steps' | 'passive'>;

const costPresent = (costs: AbilityFields['costs'], kind: AbilityCostKind) =>
  kind === 'hitDie' ? costs.hitDie : costs[kind] !== null;

function costProblem(category: AbilityCategory, kind: AbilityCostKind) {
  if (category === 'basic')
    return 'У базовой способности нет затрат: для них выберите «Умение»';
  if (category === 'spell') return 'Заклинание не тратит кость хитов';
  return kind === 'spellSlot'
    ? 'Монстр не тратит ячейки заклинаний: частота его заклинаний задаётся у монстра'
    : 'Монстр не тратит кость хитов';
}

// Почему поля не подходят категории; null — подходят. Сами поля уже проверены.
export function abilityFieldsProblem(fields: RuleFields): string | null {
  const { category, activation, costs } = fields;
  if (!activationFitsCategory(category, activation)) {
    return category === 'spell'
      ? 'Заклинание сотворяют действием, бонусным действием, реакцией или дольше'
      : 'Легендарное действие бывает только у способности монстра';
  }
  const trait = activation.kind === 'trait';
  const allowed = allowedCostKinds(category, activation.kind);
  const extra = ABILITY_COST_KINDS.find(
    (kind) => costPresent(costs, kind) && !allowed.includes(kind),
  );
  if (extra) {
    return trait
      ? 'У черты нет затрат: она действует сама'
      : costProblem(category, extra);
  }
  if (!hasRules(category) && fields.steps.length > 0)
    return 'У базовой способности нет «Применения»: для него выберите «Умение»';
  if (!hasRules(category) && fields.passive.length > 0)
    return 'У базовой черты нет составляющих: для них выберите «Умение»';
  if (fields.category === 'monster') {
    const { recharge } = fields.details;
    if (trait && recharge !== null) return 'У черты нет перезарядки';
    if (monsterLimitOf(costs, recharge) === null)
      return 'Ограничение монстра — одно из «N/день», «Перезарядка» и «после отдыха»';
  }
  return null;
}
