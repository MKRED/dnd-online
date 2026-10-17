import { ABILITY_STEPS_MAX, type AbilityStep } from './abilitySteps.js';
import { isAbilityStep } from './abilityStepsCheck.js';

// Поля шага, у которых есть естественное значение по умолчанию, по уровням вложенности.
// Когда в шаг или исход добавляют поле («когда» и «кого» этапа 5, эффекты этапа 7), его
// умолчание дописывают сюда: шаги, сохранённые раньше, получат его при чтении, а не
// пропадут. Поле без естественного умолчания так добавлять нельзя — только с миграцией
// данных. Тот же приём, что у составляющих эффекта (effectComponentsRead.ts).
export const STEP_STORED_DEFAULTS = {
  step: { miss: { damage: 'none' } },
  hit: { damage: [], addModifier: false },
  miss: {},
} satisfies Record<'step' | 'hit' | 'miss', Record<string, unknown>>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const withDefaults = (value: unknown, defaults: Record<string, unknown>) =>
  isObject(value) ? { ...defaults, ...value } : value;

function fill(stored: Record<string, unknown>): unknown {
  const step: Record<string, unknown> = {
    ...STEP_STORED_DEFAULTS.step,
    ...stored,
  };
  return {
    ...step,
    hit: withDefaults(step.hit ?? {}, STEP_STORED_DEFAULTS.hit),
    miss: withDefaults(step.miss, STEP_STORED_DEFAULTS.miss),
  };
}

// Шаги из базы — мягче, чем из запроса (isAbilitySteps): недостающие поля заполняются
// умолчаниями, испорченный шаг пропускается, остальные остаются.
export function readAbilitySteps(value: unknown): AbilityStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map(fill)
    .filter(isAbilityStep)
    .slice(0, ABILITY_STEPS_MAX);
}
