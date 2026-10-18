import { describe, expect, it } from 'vitest';
import { stepEffectOutcomes } from './abilityStepEffectLabels.js';
import {
  STEP_EFFECTS_MAX,
  isStepEffects,
  stepEffectLinks,
  withoutStepEffects,
} from './abilityStepEffects.js';
import { formatAbilityStep } from './abilityStepLabels.js';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps } from './abilityStepsCheck.js';
import { readAbilitySteps } from './abilityStepsRead.js';

// Эффекты в исходах шага (этап 8): примеры из docs/dnd/attacks-and-saves.md.
const POISONED = '11111111-1111-4111-8111-111111111111';
const PARALYZED = '22222222-2222-4222-8222-222222222222';
const SLOWED = '33333333-3333-4333-8333-333333333333';

// «Луч болезни»: при попадании 2d8 Яд и «Отравлен».
const rayOfSickness: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 60, longFeet: null },
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 2, die: 8, number: 0, type: 'poison' }],
    addModifier: false,
    effects: [{ effectId: POISONED }],
  },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
};

// «Ошеломляющий удар»: свой эффект и при провале, и при успехе.
const stunningStrike: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'touch' },
  check: {
    kind: 'save',
    ability: 'constitution',
    dc: { kind: 'ability', ability: 'wisdom' },
  },
  hit: { damage: [], addModifier: false, effects: [{ effectId: PARALYZED }] },
  miss: { damage: 'none', effects: [{ effectId: SLOWED }] },
  growth: { damage: [], times: 0 },
};

// «Ярость»: на себя, без проверки, только эффект.
const rage: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'self' },
  check: { kind: 'none' },
  hit: { damage: [], addModifier: false, effects: [{ effectId: SLOWED }] },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
};

describe('эффекты в исходах шага', () => {
  it('принимает эффекты при попадании, провале, успехе и без проверки', () => {
    expect(isAbilitySteps([rayOfSickness])).toBe(true);
    expect(isAbilitySteps([stunningStrike])).toBe(true);
    expect(isAbilitySteps([rage])).toBe(true);
  });

  it('отказывает: эффект при промахе без проверки, повтор, лишние поля, не id', () => {
    const effects = (list: unknown) => [
      { ...rayOfSickness, hit: { ...rayOfSickness.hit, effects: list } },
    ];
    expect(
      isAbilitySteps([
        {
          ...rage,
          miss: { damage: 'none', effects: [{ effectId: POISONED }] },
        },
      ]),
    ).toBe(false);
    expect(
      isAbilitySteps(effects([{ effectId: POISONED }, { effectId: POISONED }])),
    ).toBe(false);
    expect(
      isAbilitySteps(effects([{ effectId: POISONED, effect: null }])),
    ).toBe(false);
    expect(isAbilitySteps(effects([{ effectId: 'отравление' }]))).toBe(false);
    expect(isAbilitySteps(effects(undefined))).toBe(false);
    expect(
      isStepEffects(
        Array.from({ length: STEP_EFFECTS_MAX + 1 }, (_, i) => ({
          effectId: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
        })),
      ),
    ).toBe(false);
  });

  it('шаг из базы без эффектов читается без них', () => {
    const stored = {
      ...rayOfSickness,
      hit: { damage: rayOfSickness.hit.damage, addModifier: false },
      miss: { damage: 'none' },
    };
    const [step] = readAbilitySteps([stored]);
    expect(step.hit.effects).toEqual([]);
    expect(step.miss.effects).toEqual([]);
  });

  it('связи по шагам и исходам; в базу шагов эффекты не пишутся', () => {
    expect(stepEffectLinks([rayOfSickness, stunningStrike])).toEqual([
      { step: 0, outcome: 'hit', effectId: POISONED },
      { step: 1, outcome: 'hit', effectId: PARALYZED },
      { step: 1, outcome: 'miss', effectId: SLOWED },
    ]);
    const stored = withoutStepEffects(stunningStrike);
    expect(stored.hit.effects).toEqual([]);
    expect(stored.miss.effects).toEqual([]);
  });

  it('подписи исходов в карточке', () => {
    expect(stepEffectOutcomes(stunningStrike).map((o) => o.label)).toEqual([
      'Провал, эффект',
      'Успех, эффект',
    ]);
    expect(stepEffectOutcomes(rage).map((o) => o.label)).toEqual(['Эффект']);
    // Шаг только с эффектом — без строки «без урона».
    expect(formatAbilityStep(rage)).toEqual(['Без проверки, на себя']);
  });
});
