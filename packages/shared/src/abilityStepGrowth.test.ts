import { describe, expect, it } from 'vitest';
import type { AbilityVariant } from './abilities.js';
import { growthBasis, NO_STEP_GROWTH } from './abilityStepGrowth.js';
import {
  formatGrowthBasis,
  formatStepGrowth,
  formatStepsWithGrowth,
} from './abilityStepGrowthLabels.js';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps } from './abilityStepsCheck.js';
import { readAbilitySteps } from './abilityStepsRead.js';
import { NO_ABILITY_COSTS } from './abilityUsage.js';

// Рост шага (этап 7) на примерах книги 2024 (docs/dnd/spells.md, «Growth»).
const fire = (count: number, die: 6 | 10) => ({
  count,
  die,
  number: 0,
  type: 'fire' as const,
});
const fireBolt: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 120, longFeet: null },
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: { damage: [fire(1, 10)], addModifier: false },
  miss: { damage: 'none' },
  growth: { damage: [fire(1, 10)], times: 0 },
};
// «Волшебная стрела»: три дротика, +1 за круг выше 1.
const magicMissile: AbilityStep = {
  ...fireBolt,
  check: { kind: 'none' },
  hit: {
    damage: [{ count: 1, die: 4, number: 1, type: 'force' }],
    addModifier: false,
  },
  times: 3,
  growth: { damage: [], times: 1 },
};

const basic: AbilityVariant = { category: 'basic', details: {} };
const spell = (level: number): AbilityVariant => ({
  category: 'spell',
  details: {
    level,
    school: 'evocation',
    components: '',
    ritual: false,
    duration: { kind: 'instant' },
  },
});
const slot = (minLevel: number) => ({
  ...NO_ABILITY_COSTS,
  spellSlot: { minLevel },
});

describe('рост шага', () => {
  it('с чем растёт, решает способность', () => {
    expect(growthBasis(spell(3), slot(3))).toEqual({ kind: 'slot', above: 3 });
    // «Мистическая кара» — не заклинание, но тратит ячейку.
    expect(growthBasis(basic, slot(1))).toEqual({ kind: 'slot', above: 1 });
    expect(growthBasis(spell(0), NO_ABILITY_COSTS)).toEqual({ kind: 'level' });
    // Оружие дыхания.
    expect(growthBasis(basic, NO_ABILITY_COSTS)).toEqual({ kind: 'level' });
    // Копия заклинания от черты, без ячейки.
    expect(growthBasis(spell(1), NO_ABILITY_COSTS)).toEqual({ kind: 'none' });
  });

  it('проверка запроса', () => {
    expect(isAbilitySteps([fireBolt])).toBe(true);
    expect(isAbilitySteps([magicMissile])).toBe(true);
    const { growth: _growth, ...noGrowth } = fireBolt;
    for (const growth of [
      undefined,
      { damage: [] },
      { damage: [], times: 4 },
      { damage: [], times: -1 },
      { damage: [{ ...fire(0, 6) }], times: 0 },
      { damage: Array.from({ length: 6 }, () => fire(1, 6)), times: 0 },
      { damage: [], times: 0, extra: 1 },
    ])
      expect(isAbilitySteps([{ ...noGrowth, growth }])).toBe(false);
    expect(isAbilitySteps([noGrowth])).toBe(false);
  });

  // Шаги этапов 3–6 лежат в базе без роста.
  it('шаг из базы без роста читается не растущим', () => {
    const { growth: _growth, ...stored } = fireBolt;
    expect(readAbilitySteps([stored, stored])).toEqual([
      { ...fireBolt, growth: NO_STEP_GROWTH },
      { ...fireBolt, growth: NO_STEP_GROWTH },
    ]);
  });

  it('подписи', () => {
    expect(formatGrowthBasis({ kind: 'slot', above: 3 })).toBe(
      'За каждый круг ячейки выше 3',
    );
    expect(formatGrowthBasis({ kind: 'level' })).toBe(
      'На 5, 11 и 17 уровне персонажа',
    );
    expect(formatStepGrowth(fireBolt.growth, { kind: 'level' })).toBe(
      'Рост на 5, 11 и 17 уровне: +1d10 Огонь',
    );
    expect(
      formatStepGrowth(
        { damage: [fire(1, 6)], times: 2 },
        { kind: 'slot', above: 3 },
      ),
    ).toBe('Рост за каждый круг ячейки выше 3: +1d6 Огонь, +2 повтора');
    // Заклинание без ячейки и шаг без роста — строки нет.
    expect(formatStepGrowth(fireBolt.growth, { kind: 'none' })).toBeNull();
    expect(formatStepGrowth(NO_STEP_GROWTH, { kind: 'level' })).toBeNull();
    expect(
      formatStepsWithGrowth([magicMissile], { kind: 'slot', above: 1 })[0].at(
        -1,
      ),
    ).toBe('Рост за каждый круг ячейки выше 1: +1 повтор');
  });
});
