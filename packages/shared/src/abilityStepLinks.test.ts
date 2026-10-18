import { describe, expect, it } from 'vitest';
import { formatAbilitySteps } from './abilityStepLabels.js';
import { stepTargets, stepWhens } from './abilityStepLinks.js';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps } from './abilityStepsCheck.js';
import { readAbilitySteps } from './abilityStepsRead.js';

// Несколько шагов и повторы — примеры из книги 2024 (docs/dnd/attacks-and-saves.md,
// «Several steps and repeats»).
const knife: AbilityStep = {
  when: 'always',
  target: { kind: 'range', feet: 60, longFeet: null },
  times: 1,
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 1, die: 10, number: 0, type: 'piercing' }],
    addModifier: false,
    effects: [],
  },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
};
// «Попал или промахнулся» — шаг 2 всегда: цель и все в 5 фт. от неё спасаются.
const burst: AbilityStep = {
  when: 'always',
  target: { kind: 'around', feet: 5 },
  times: 1,
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 2, die: 6, number: 0, type: 'cold' }],
    addModifier: false,
    effects: [],
  },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
};
const scorchingRay: AbilityStep = {
  ...knife,
  target: { kind: 'range', feet: 120, longFeet: null },
  times: 3,
  hit: {
    damage: [{ count: 2, die: 6, number: 0, type: 'fire' }],
    addModifier: false,
    effects: [],
  },
};
const area: AbilityStep['target'] = {
  kind: 'area',
  area: { shape: 'sphere', radius: 20 },
  origin: { kind: 'point', feet: 150 },
};
const self: AbilityStep = {
  ...knife,
  target: { kind: 'self' },
  check: { kind: 'none' },
};
const step = (base: AbilityStep, patch: Record<string, unknown>) => ({
  ...base,
  ...patch,
});

describe('несколько шагов', () => {
  it('принимает «Ледяной кинжал» и «Палящий луч»', () => {
    expect(isAbilitySteps([knife, burst])).toBe(true);
    expect(isAbilitySteps([knife, { ...burst, when: 'hit' }])).toBe(true);
    expect(isAbilitySteps([scorchingRay])).toBe(true);
    // После повторов шаг срабатывает для каждого луча: вокруг цели каждого.
    expect(isAbilitySteps([scorchingRay, { ...burst, when: 'hit' }])).toBe(
      true,
    );
    // Та же цель: после области — все в ней, после «на себя» — без проверки.
    expect(
      isAbilitySteps([
        { ...burst, target: area },
        step(knife, { target: { kind: 'previous' }, check: { kind: 'none' } }),
      ]),
    ).toBe(true);
    expect(
      isAbilitySteps([
        self,
        step(self, { target: { kind: 'previous' } }),
        step(self, { target: { kind: 'previous' } }),
      ]),
    ).toBe(true);
  });

  it('отказывает неверной цепочке', () => {
    const bad: unknown[][] = [
      // У первого шага нет ни «когда» по исходу, ни целей прошлого шага.
      [{ ...knife, when: 'hit' }],
      [{ ...burst }],
      [step(knife, { target: { kind: 'previous' } })],
      // По исходу шага без проверки.
      [self, step(self, { when: 'miss' })],
      // Спасбросок на самого себя через «ту же цель».
      [self, step(burst, { target: { kind: 'previous' } })],
      // «Она и все вокруг» — только вокруг одной цели и не атакой.
      [{ ...burst, target: area }, burst],
      [knife, step(knife, { target: { kind: 'around', feet: 5 } })],
      [knife, step(burst, { target: { kind: 'around', feet: 65 } })],
      [knife, step(burst, { target: { kind: 'around', feet: 7 } })],
      // Сколько раз: от 1 до 20, целое.
      [{ ...knife, times: 0 }],
      [{ ...knife, times: 21 }],
      [{ ...knife, times: 1.5 }],
      // Без поля — в запросе нельзя, это только при чтении из базы.
      [{ ...knife, times: undefined }],
    ];
    for (const steps of bad) expect(isAbilitySteps(steps)).toBe(false);
  });

  it('какие цели и «когда» доступны шагу', () => {
    const one = { check: 'attack' as const, reach: 'one' as const };
    expect(stepWhens(null)).toEqual(['always']);
    expect(stepWhens({ check: 'none', reach: 'one' })).toEqual(['always']);
    expect(stepWhens(one)).toEqual(['always', 'hit', 'miss']);
    expect(stepTargets(burst.check, one)).toEqual([
      'previous',
      'around',
      'touch',
      'reach',
      'range',
      'area',
    ]);
    expect(stepTargets(knife.check, { ...one, reach: 'many' })).toEqual([
      'previous',
      'range',
    ]);
    expect(stepTargets(burst.check, { ...one, reach: 'self' })).not.toContain(
      'previous',
    );
  });

  it('при чтении проверяет шаги цепочкой', () => {
    expect(readAbilitySteps([knife, burst])).toEqual([knife, burst]);
    // Шаг 2 без «когда» — всегда; «вокруг» после области — обрыв.
    const { when: _when, ...noWhen } = burst;
    expect(readAbilitySteps([knife, noWhen])).toEqual([knife, burst]);
    expect(readAbilitySteps([{ ...burst, target: area }, burst])).toEqual([
      { ...burst, target: area },
    ]);
  });

  it('строки карточки', () => {
    expect(
      formatAbilitySteps([
        knife,
        { ...burst, when: 'hit' },
        { ...scorchingRay, when: 'miss' },
      ]),
    ).toEqual([
      [
        'Дальнобойная атака заклинанием, 60 фт.',
        'Бонус атаки: модификатор заклинательной характеристики + бонус мастерства',
        'Попадание: 1d10 Колющий',
      ],
      [
        'При попадании — спасбросок Ловкости, цель и все в 5 фт. от неё',
        'Сл 8 + модификатор заклинательной характеристики + бонус мастерства',
        'Провал: 2d6 Холод',
      ],
      [
        'При успехе — дальнобойная атака заклинанием ×3, 120 фт.',
        'Бонус атаки: модификатор заклинательной характеристики + бонус мастерства',
        'Попадание: 2d6 Огонь',
      ],
    ]);
    expect(
      formatAbilitySteps([
        self,
        step(self, { target: { kind: 'previous' } }),
      ])[1][0],
    ).toBe('Затем — без проверки, та же цель');
  });
});
