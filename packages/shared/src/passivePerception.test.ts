import { describe, expect, it } from 'vitest';
import type { EffectComponent } from './effectComponents.js';
import { expandConditions } from './conditionsExpand.js';
import { passivePerceptionBase, perceptionShift } from './passivePerception.js';

const scores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 14,
  charisma: 10,
};

describe('passivePerceptionBase', () => {
  it('10 + Мудрость без владения', () => {
    expect(
      passivePerceptionBase({
        abilityScores: scores,
        proficiencyBonus: 3,
        skillProficiencies: [],
      }),
    ).toBe(12);
  });

  it('бонус мастерства, с компетентностью — вдвое', () => {
    const base = { abilityScores: scores, proficiencyBonus: 3 };
    expect(
      passivePerceptionBase({
        ...base,
        skillProficiencies: [{ skill: 'perception', expertise: false }],
      }),
    ).toBe(15);
    expect(
      passivePerceptionBase({
        ...base,
        skillProficiencies: [{ skill: 'perception', expertise: true }],
      }),
    ).toBe(18);
  });
});

const advantage = (
  mode: 'advantage' | 'disadvantage',
  roll: 'check' | 'd20' | 'save',
  ability: 'wisdom' | 'strength' | null = null,
  when: 'source_in_sight' | null = null,
): EffectComponent => ({ kind: 'advantage', mode, roll, ability, when });
const bonus = (
  mode: 'bonus' | 'penalty',
  number: number,
  count = 0,
): EffectComponent => ({
  kind: 'roll_bonus',
  mode,
  roll: 'check',
  ability: 'wisdom',
  count,
  die: 4,
  number,
  damageType: null,
});
const shift = (...effects: [string, EffectComponent[]][]) =>
  perceptionShift(
    expandConditions(
      effects.map(([source, components]) => ({ source, components })),
    ),
    (source) => (source === 'condition:poisoned' ? 'Отравленный' : source),
  );

describe('perceptionShift', () => {
  it('преимущество на проверки Мудрости — +5, на все Тесты к20 тоже', () => {
    expect(
      shift(['Чутьё', [advantage('advantage', 'check', 'wisdom')]]),
    ).toEqual({
      shift: 5,
      lines: [{ text: 'Преимущество: +5', amount: 5, from: ['Чутьё'] }],
    });
    expect(shift(['Предвидение', [advantage('advantage', 'd20')]]).shift).toBe(
      5,
    );
  });

  it('Отравленный через своё состояние — −5', () => {
    expect(
      shift(['Яд', [{ kind: 'condition', condition: 'poisoned' }]]).lines,
    ).toEqual([{ text: 'Помеха: −5', amount: -5, from: ['Отравленный'] }]);
  });

  it('преимущество и помеха гасят друг друга', () => {
    expect(
      shift(
        ['А', [advantage('advantage', 'check')]],
        ['Б', [advantage('disadvantage', 'check')]],
      ),
    ).toEqual({ shift: 0, lines: [] });
  });

  it('другие характеристики, спасброски и преимущество с условием не считаются', () => {
    expect(
      shift([
        'А',
        [
          advantage('advantage', 'check', 'strength'),
          advantage('advantage', 'save'),
          advantage('disadvantage', 'check', null, 'source_in_sight'),
        ],
      ]),
    ).toEqual({ shift: 0, lines: [] });
  });

  it('число бонуса или вычета — да, кость — нет', () => {
    const result = shift(
      ['Очарование', [bonus('penalty', 10)]],
      ['Наставление', [bonus('bonus', 0, 1)]],
    );
    expect(result.shift).toBe(-10);
    expect(result.lines).toEqual([
      { text: '−10', amount: -10, from: ['Очарование'] },
    ]);
  });
});
