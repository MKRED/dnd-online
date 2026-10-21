import {
  ABILITY_STEPS_MAX,
  AROUND_FEET_MAX,
  FEET_STEP,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  STEP_TIMES_MAX,
  type AbilityCheck,
  type StepWhen,
} from './abilitySteps.js';
import {
  nextLink,
  stepTargets,
  stepWhens,
  type StepLink,
} from './abilityStepLinks.js';
import {
  isStepCheck,
  isStepHit,
  isStepMiss,
  isStepTarget,
} from './abilityStepsCheck.js';
import { isStepGrowth } from './abilityStepDamageCheck.js';
import { isIntIn, isObject, keysAre } from './abilityStepGuards.js';

// Что именно не так в шагах «Применения» — для ответа сервера на запрос в обход формы
// (MCP, этап 7 docs/plan/ai-access.md): общий «задано неверно» не говорил, какое поле
// исправлять. Проверяет те же части и в том же порядке, что isAbilityStep, и называет
// первую неверную; null — шаги верны.
export function abilityStepsProblem(value: unknown): string | null {
  if (!Array.isArray(value)) return 'steps — должен быть список шагов';
  if (value.length > ABILITY_STEPS_MAX)
    return `steps — не больше ${ABILITY_STEPS_MAX} шагов`;
  let link: StepLink | null = null;
  for (const [i, step] of value.entries()) {
    const problem = stepProblem(step, link);
    if (problem) return `шаг ${i + 1}: ${problem}`;
    link = nextLink(step, link);
  }
  return null;
}

const STEP_KEYS = 'check,growth,hit,miss,target,times,when';

function stepProblem(value: unknown, link: StepLink | null): string | null {
  if (!isObject(value) || !keysAre(value, STEP_KEYS))
    return `нужны ровно поля ${STEP_KEYS.split(',').join(', ')}`;
  const whens = stepWhens(link);
  if (!whens.includes(value.when as StepWhen))
    return `when — здесь можно только ${whens.join(', ')}`;
  if (!isIntIn(value.times, 1, STEP_TIMES_MAX))
    return `times — целое от 1 до ${STEP_TIMES_MAX}`;
  const { check } = value;
  if (!isStepCheck(check))
    return 'check — attack {attack, bonus}, save {ability, dc} или none';
  if (!isStepTarget(value.target, check, link))
    return `target — ${targetHint(check, link)}`;
  if (!isStepHit(value.hit, check))
    return 'hit — {damage, addModifier, effects}; addModifier только у атаки с бонусом от характеристики';
  if (!isStepMiss(value.miss, value.hit, check))
    return 'miss — {damage: none|half, effects}; half — только при уроне в hit, и при check none промаха нет';
  if (!isStepGrowth(value.growth)) return 'growth — {damage, times}';
  return null;
}

function targetHint(check: AbilityCheck, link: StepLink | null): string {
  const feet = (max: number) =>
    `от ${FEET_STEP} до ${max}, кратно ${FEET_STEP}`;
  return [
    `для этой проверки можно ${stepTargets(check, link).join(', ')}`,
    `reach.feet ${feet(REACH_FEET_MAX)}`,
    `range.feet ${feet(RANGE_FEET_MAX)}`,
    `around.feet ${feet(AROUND_FEET_MAX)}`,
  ].join('; ');
}
