import { describe, expect, it } from 'vitest';
import { CONDITION_RULES } from './conditionComponents.js';
import { isEffectComponents } from './effectComponents.js';
import { CONDITION_KINDS, type ConditionKind } from './effectConditions.js';

// Состояние со всеми включёнными: Бессознательный — ещё Недееспособный и Опрокинутый.
function withIncluded(kind: ConditionKind): ConditionKind[] {
  return [kind, ...CONDITION_RULES[kind].includes.flatMap(withIncluded)];
}

describe('CONDITION_RULES', () => {
  it('составляющие каждого состояния — верные и вместе с включёнными не повторяются', () => {
    for (const kind of CONDITION_KINDS) {
      const own = CONDITION_RULES[kind].components;
      expect(isEffectComponents(own), kind).toBe(true);
      const all = withIncluded(kind).flatMap(
        (k) => CONDITION_RULES[k].components,
      );
      expect(isEffectComponents(all), kind).toBe(true);
    }
  });

  // Тот же список, что в docs/plan/done/effects-coverage.md («целиком ложатся»): расхождение
  // плана и кода краснит тест.
  it('целиком составляющими — те же состояния, что в плане', () => {
    const whole = CONDITION_KINDS.filter(
      (kind) => CONDITION_RULES[kind].gaps.length === 0,
    );
    expect(whole).toEqual(['petrified', 'poisoned', 'restrained', 'stunned']);
  });

  it('у состояния без составляющих назван пробел', () => {
    for (const kind of CONDITION_KINDS) {
      const { components, includes, gaps } = CONDITION_RULES[kind];
      if (components.length + includes.length === 0) {
        expect(gaps.length, kind).toBeGreaterThan(0);
      }
    }
  });
});
