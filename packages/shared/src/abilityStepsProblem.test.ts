import { describe, expect, it } from 'vitest';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps } from './abilityStepsCheck.js';
import { abilityStepsProblem } from './abilityStepsProblem.js';

// Укус: +4 к попаданию, 1к4 колющего; второй шаг — спасбросок Телосложения по той же цели.
const bite: AbilityStep = {
  when: 'always',
  target: { kind: 'reach', feet: 5 },
  times: 1,
  check: {
    kind: 'attack',
    attack: 'melee_weapon',
    bonus: { kind: 'fixed', value: 4 },
  },
  hit: {
    damage: [{ count: 1, die: 4, number: 0, type: 'piercing' }],
    addModifier: false,
    effects: [],
  },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
};
const save: AbilityStep = {
  ...bite,
  when: 'hit',
  target: { kind: 'previous' },
  check: {
    kind: 'save',
    ability: 'constitution',
    dc: { kind: 'fixed', value: 10 },
  },
  hit: { damage: [], addModifier: false, effects: [] },
};

describe('abilityStepsProblem — что не так в шагах «Применения»', () => {
  it('верные шаги — null, как и у isAbilitySteps', () => {
    expect(abilityStepsProblem([bite, save])).toBeNull();
    expect(isAbilitySteps([bite, save])).toBe(true);
    expect(abilityStepsProblem([])).toBeNull();
  });

  it('называет шаг и поле с допустимыми значениями', () => {
    expect(
      abilityStepsProblem([{ ...bite, target: { kind: 'reach', feet: 0 } }]),
    ).toMatch(/^шаг 1: target — .*reach\.feet от 5 до 30, кратно 5/);
    expect(abilityStepsProblem([bite, { ...save, when: 'nope' }])).toMatch(
      /^шаг 2: when — здесь можно только /,
    );
    expect(abilityStepsProblem([{ ...bite, times: 0 }])).toMatch(
      /^шаг 1: times — /,
    );
    expect(
      abilityStepsProblem([
        { ...bite, miss: { damage: 'half', effects: [] }, hit: save.hit },
      ]),
    ).toMatch(/^шаг 1: miss — /);
    expect(abilityStepsProblem([{ ...bite, extra: 1 }])).toMatch(
      /^шаг 1: нужны ровно поля /,
    );
  });

  it('не список и слишком много шагов', () => {
    expect(abilityStepsProblem({})).toBe('steps — должен быть список шагов');
    expect(abilityStepsProblem([bite, bite, bite, bite])).toBe(
      'steps — не больше 3 шагов',
    );
  });
});
