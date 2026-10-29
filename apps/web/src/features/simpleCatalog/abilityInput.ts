import {
  allowedCostKinds,
  growthBasis,
  hasRules,
  monsterLimitStored,
  type AbilityCategory,
  type AbilityCosts,
  type AbilityVariant,
  type GrowthBasis,
} from 'shared';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import { fromEffectValues } from './EffectFields';
import { fromMonsterAbilityValues } from './monsterAbilityForm';
import { fromSpellValues, spellCosts } from './SpellFields';
import { fromUsageValues } from './UsageField';

// Составляющие черты в форме живут там же, где у эффекта, — в effect.components: редактор
// составляющих один (docs/plan/done/traits.md). У других активаций и у «Базовой» их нет.
const passiveInput = (values: SimpleFormValues) =>
  values.usage.kind === 'trait' && hasRules(values.category as AbilityCategory)
    ? fromEffectValues(values.effect).components
    : [];

// Затраты, которых у категории и активации нет (docs/plan/ability-categories.md), в запрос
// не идут: форма их не показывает, но отмеченное до смены категории осталось в значениях.
function allowedCosts(
  costs: AbilityCosts,
  category: AbilityCategory,
  values: SimpleFormValues,
): AbilityCosts {
  const allowed = allowedCostKinds(category, values.usage.kind);
  return {
    uses: allowed.includes('uses') ? costs.uses : null,
    spellSlot: allowed.includes('spellSlot') ? costs.spellSlot : null,
    movement: allowed.includes('movement') ? costs.movement : null,
    hitDie: allowed.includes('hitDie') && costs.hitDie,
  };
}

// Категория и её поля для запроса: у заклинания ячейка в затратах — его круга, у монстра
// заряды и перезарядка — из «Ограничения» (у черты его нет).
export function abilityCategoryInput(values: SimpleFormValues) {
  const category = values.category as AbilityCategory;
  const usage = fromUsageValues(values.usage);
  const costs = allowedCosts(usage.costs, category, values);
  const fields = { ...usage, costs, passive: passiveInput(values) };
  if (category === 'monster') {
    const limit =
      values.usage.kind === 'trait'
        ? ({ kind: 'none' } as const)
        : fromMonsterAbilityValues(values.monster);
    const { uses, recharge } = monsterLimitStored(limit);
    return {
      category,
      details: { recharge },
      ...fields,
      costs: { ...costs, uses },
    };
  }
  if (category !== 'spell') return { category, details: {}, ...fields };
  const details = fromSpellValues(values.spell);
  return {
    category,
    details,
    ...fields,
    costs: spellCosts(costs, details.level),
  };
}

// С чем растут шаги по тому, что сейчас в форме, — так же, как карточка решит после
// сохранения (shared/abilityStepGrowth.ts).
export function formGrowthBasis(values: SimpleFormValues): GrowthBasis {
  const { costs, ...variant } = abilityCategoryInput(values);
  return growthBasis(variant as AbilityVariant, costs);
}
