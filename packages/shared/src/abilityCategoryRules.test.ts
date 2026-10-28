import { describe, expect, it } from 'vitest';
import type { AbilityVariant } from './abilities.js';
import {
  abilityFieldsProblem,
  activationFitsCategory,
  allowedCostKinds,
} from './abilityCategoryRules.js';
import {
  NO_ABILITY_COSTS,
  type AbilityActivation,
  type AbilityCosts,
} from './abilityUsage.js';
import type { AbilityStep } from './abilitySteps.js';
import type { EffectComponent } from './effectComponents.js';

const ACTION: AbilityActivation = { kind: 'action' };
const TRAIT: AbilityActivation = { kind: 'trait' };
const USES: AbilityCosts['uses'] = {
  count: { kind: 'fixed', amount: 3 },
  recovery: 'long',
};
const DARKVISION = {
  kind: 'sense',
  sense: 'darkvision',
  feet: 60,
} as unknown as EffectComponent;

const VARIANTS: Record<string, AbilityVariant> = {
  basic: { category: 'basic', details: {} },
  feature: { category: 'feature', details: {} },
  monster: { category: 'monster', details: { recharge: null } },
};

function problem(
  variant: AbilityVariant,
  {
    activation = ACTION,
    costs = {},
    steps = [],
    passive = [],
  }: {
    activation?: AbilityActivation;
    costs?: Partial<AbilityCosts>;
    steps?: AbilityStep[];
    passive?: EffectComponent[];
  } = {},
) {
  return abilityFieldsProblem({
    ...variant,
    activation,
    costs: { ...NO_ABILITY_COSTS, ...costs },
    steps,
    passive,
  });
}

describe('активации по категории', () => {
  it('легендарное — только «Монстр», черта — у всех, кроме заклинания', () => {
    const legendary = { kind: 'legendary', cost: 1 } as const;
    expect(activationFitsCategory('monster', legendary)).toBe(true);
    expect(activationFitsCategory('feature', legendary)).toBe(false);
    expect(activationFitsCategory('basic', legendary)).toBe(false);
    for (const category of ['basic', 'feature', 'monster'] as const)
      expect(activationFitsCategory(category, TRAIT)).toBe(true);
    expect(activationFitsCategory('spell', TRAIT)).toBe(false);
  });

  it('заклинание: действие, бонусное, реакция или время', () => {
    expect(activationFitsCategory('spell', ACTION)).toBe(true);
    expect(
      activationFitsCategory('spell', {
        kind: 'time',
        amount: 1,
        unit: 'minute',
      }),
    ).toBe(true);
    expect(activationFitsCategory('spell', { kind: 'free', trigger: '' })).toBe(
      false,
    );
    expect(activationFitsCategory('spell', { kind: 'attack' })).toBe(false);
  });
});

describe('allowedCostKinds', () => {
  it('у черты и «Базовой» затрат нет', () => {
    expect(allowedCostKinds('feature', 'trait')).toEqual([]);
    expect(allowedCostKinds('monster', 'trait')).toEqual([]);
    expect(allowedCostKinds('basic', 'action')).toEqual([]);
  });

  it('монстр без ячейки и кости хитов, заклинание без кости хитов', () => {
    expect(allowedCostKinds('feature', 'action')).toEqual([
      'uses',
      'spellSlot',
      'movement',
      'hitDie',
    ]);
    expect(allowedCostKinds('spell', 'action')).toEqual([
      'uses',
      'spellSlot',
      'movement',
    ]);
    expect(allowedCostKinds('monster', 'action')).toEqual(['uses', 'movement']);
  });
});

describe('abilityFieldsProblem', () => {
  it('«Базовая» — только текст с активацией', () => {
    expect(problem(VARIANTS.basic)).toBeNull();
    expect(problem(VARIANTS.basic, { activation: TRAIT })).toBeNull();
    expect(problem(VARIANTS.basic, { costs: { uses: USES } })).toMatch(
      /нет затрат/,
    );
    expect(problem(VARIANTS.basic, { steps: [{} as AbilityStep] })).toMatch(
      /нет «Применения»/,
    );
    expect(
      problem(VARIANTS.basic, { activation: TRAIT, passive: [DARKVISION] }),
    ).toMatch(/нет составляющих/);
  });

  it('«Умение» — всё, что умела прежняя «Базовая»', () => {
    expect(
      problem(VARIANTS.feature, {
        costs: { uses: USES, spellSlot: { minLevel: 1 }, hitDie: true },
        steps: [{} as AbilityStep],
      }),
    ).toBeNull();
    expect(
      problem(VARIANTS.feature, { activation: TRAIT, passive: [DARKVISION] }),
    ).toBeNull();
  });

  it('у черты нет затрат и перезарядки', () => {
    expect(
      problem(VARIANTS.feature, { activation: TRAIT, costs: { uses: USES } }),
    ).toBe('У черты нет затрат: она действует сама');
    expect(
      problem(
        { category: 'monster', details: { recharge: 5 } },
        { activation: TRAIT },
      ),
    ).toBe('У черты нет перезарядки');
  });

  it('монстр: без ячейки и кости хитов, одно ограничение', () => {
    expect(
      problem(VARIANTS.monster, { costs: { spellSlot: { minLevel: 1 } } }),
    ).toMatch(/ячейки/);
    expect(problem(VARIANTS.monster, { costs: { hitDie: true } })).toMatch(
      /кость хитов/,
    );
    expect(problem(VARIANTS.monster, { costs: { uses: USES } })).toBeNull();
    expect(
      problem(VARIANTS.monster, {
        costs: { uses: { count: { kind: 'proficiency' }, recovery: 'long' } },
      }),
    ).toMatch(/Ограничение монстра/);
    expect(
      problem(
        { category: 'monster', details: { recharge: 5 } },
        { costs: { uses: USES } },
      ),
    ).toMatch(/Ограничение монстра/);
  });

  it('заклинание сотворяют не «без действия» и не тратят кость хитов', () => {
    const spell = {
      category: 'spell',
      details: {},
    } as unknown as AbilityVariant;
    expect(problem(spell, { activation: { kind: 'attack' } })).toMatch(
      /Заклинание сотворяют/,
    );
    expect(problem(spell, { costs: { hitDie: true } })).toBe(
      'Заклинание не тратит кость хитов',
    );
  });

  it('легендарное действие не у монстра', () => {
    expect(
      problem(VARIANTS.feature, { activation: { kind: 'legendary', cost: 1 } }),
    ).toBe('Легендарное действие бывает только у способности монстра');
  });
});
