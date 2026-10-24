import { growthBasis, type AbilityVariant, type GrowthBasis } from 'shared';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import { fromEffectValues } from './EffectFields';
import { fromMonsterAbilityValues } from './monsterAbilityForm';
import { fromSpellValues, spellCosts } from './SpellFields';
import { fromUsageValues } from './UsageField';

// Составляющие черты в форме живут там же, где у эффекта, — в effect.components: редактор
// составляющих один (docs/plan/done/traits.md). У других активаций их нет.
const passiveInput = (values: SimpleFormValues) =>
  values.usage.kind === 'trait'
    ? fromEffectValues(values.effect).components
    : [];

// Категория и её поля для запроса: у заклинания ячейка в затратах — его круга.
export function abilityCategoryInput(values: SimpleFormValues) {
  const usage = {
    ...fromUsageValues(values.usage),
    passive: passiveInput(values),
  };
  if (values.category === 'monster')
    return {
      category: 'monster',
      details: fromMonsterAbilityValues(values.monster),
      ...usage,
    };
  if (values.category !== 'spell')
    return { category: values.category, details: {}, ...usage };
  const details = fromSpellValues(values.spell);
  return {
    category: 'spell',
    details,
    ...usage,
    costs: spellCosts(usage.costs, details.level),
  };
}

// С чем растут шаги по тому, что сейчас в форме, — так же, как карточка решит после
// сохранения (shared/abilityStepGrowth.ts).
export function formGrowthBasis(values: SimpleFormValues): GrowthBasis {
  const { costs, ...variant } = abilityCategoryInput(values);
  return growthBasis(variant as AbilityVariant, costs);
}
