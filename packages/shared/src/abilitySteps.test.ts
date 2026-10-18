import { describe, expect, it } from 'vitest';
import { formatAbilityStep } from './abilityStepLabels.js';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps } from './abilityStepsCheck.js';
import { readAbilitySteps } from './abilityStepsRead.js';

// Примеры из книги 2024 (docs/dnd/attacks-and-saves.md).
const fireBolt: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 120, longFeet: null },
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 1, die: 10, number: 0, type: 'fire' }],
    addModifier: false,
  },
  miss: { damage: 'none' },
  growth: { damage: [], times: 0 },
};
const longbow: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 150, longFeet: 600 },
  check: {
    kind: 'attack',
    attack: 'ranged_weapon',
    bonus: { kind: 'ability', ability: 'dexterity' },
  },
  hit: {
    damage: [{ count: 1, die: 8, number: 0, type: 'piercing' }],
    addModifier: true,
  },
  miss: { damage: 'none' },
  growth: { damage: [], times: 0 },
};
const flameTongue: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'reach', feet: 5 },
  check: {
    kind: 'attack',
    attack: 'melee_weapon',
    bonus: { kind: 'fixed', value: 7 },
  },
  hit: {
    damage: [
      { count: 1, die: 8, number: 3, type: 'slashing' },
      { count: 2, die: 6, number: 0, type: 'fire' },
    ],
    addModifier: false,
  },
  miss: { damage: 'half' },
  growth: { damage: [], times: 0 },
};
const withDamage = (step: AbilityStep, damage: unknown[]) => ({
  ...step,
  hit: { ...step.hit, damage },
});

describe('шаги «Применения»', () => {
  it('принимает примеры из книги и пустой список', () => {
    for (const step of [fireBolt, longbow, flameTongue]) {
      expect(isAbilitySteps([step])).toBe(true);
    }
    expect(isAbilitySteps([])).toBe(true);
  });

  it('отказывает неверным шагам', () => {
    const bad: unknown[] = [
      // Касание у дальнобойной атаки, дистанция у ближней.
      { ...fireBolt, target: { kind: 'touch' } },
      { ...flameTongue, target: fireBolt.target },
      // Дальняя дистанция у заклинания, не дальше обычной, не кратна 5.
      { ...fireBolt, target: { kind: 'range', feet: 120, longFeet: 240 } },
      { ...longbow, target: { kind: 'range', feet: 150, longFeet: 150 } },
      { ...longbow, target: { kind: 'range', feet: 152, longFeet: null } },
      { ...flameTongue, target: { kind: 'reach', feet: 35 } },
      // Пустая строка урона, неизвестный тип, к20.
      withDamage(fireBolt, [{ count: 0, die: 10, number: 0, type: 'fire' }]),
      withDamage(fireBolt, [{ count: 1, die: 10, number: 0, type: 'heat' }]),
      withDamage(fireBolt, [{ count: 1, die: 20, number: 0, type: 'fire' }]),
      // Модификатор к урону при числовом бонусе, половина от пустого урона.
      { ...flameTongue, hit: { ...flameTongue.hit, addModifier: true } },
      { ...withDamage(fireBolt, []), miss: { damage: 'half' } },
      // Исходы плоско, как до разделения на попадание и промах.
      { ...fireBolt, hit: undefined, damage: [], addModifier: false },
      // Лишнее поле, бонус вне пределов, неизвестная характеристика.
      { ...fireBolt, extra: 1 },
      {
        ...flameTongue,
        check: { ...flameTongue.check, bonus: { kind: 'fixed', value: 31 } },
      },
      {
        ...fireBolt,
        check: {
          ...fireBolt.check,
          bonus: { kind: 'ability', ability: 'luck' },
        },
      },
    ];
    for (const step of bad) expect(isAbilitySteps([step])).toBe(false);
    // Не больше трёх шагов.
    expect(isAbilitySteps([fireBolt, longbow, longbow])).toBe(true);
    expect(isAbilitySteps([fireBolt, longbow, longbow, longbow])).toBe(false);
  });

  // Выкинуть шаг из середины нельзя: следующий привязался бы к чужому прошлому.
  it('при чтении испорченный шаг обрывает цепочку', () => {
    expect(
      readAbilitySteps([{ ...fireBolt, miss: { damage: 'x' } }, longbow]),
    ).toEqual([]);
    expect(
      readAbilitySteps([fireBolt, { ...longbow, times: 0 }, longbow]),
    ).toEqual([fireBolt]);
    expect(readAbilitySteps(undefined)).toEqual([]);
  });

  // Поле, добавленное позже, у шага из базы получает умолчание, а не роняет шаг.
  it('при чтении дополняет недостающие поля умолчаниями', () => {
    const { miss: _miss, ...noMiss } = fireBolt;
    const noModifier = { ...fireBolt, hit: { damage: fireBolt.hit.damage } };
    expect(readAbilitySteps([noMiss])).toEqual([fireBolt]);
    expect(readAbilitySteps([noModifier])).toEqual([fireBolt]);
    // Шаги этапов 3 и 4 — без «когда» и «сколько раз».
    const { when: _when, times: _times, ...stage3 } = fireBolt;
    expect(readAbilitySteps([stage3])).toEqual([fireBolt]);
  });

  it('строки карточки', () => {
    expect(formatAbilityStep(fireBolt)).toEqual([
      'Дальнобойная атака заклинанием, 120 фт.',
      'Бонус атаки: модификатор заклинательной характеристики + бонус мастерства',
      'Попадание: 1d10 Огонь',
    ]);
    expect(formatAbilityStep(longbow)).toEqual([
      'Дальнобойная атака оружием, 150/600 фт.',
      'Бонус атаки: модификатор Ловкости + бонус мастерства',
      'Попадание: 1d8 Колющий + модификатор',
    ]);
    expect(formatAbilityStep(flameTongue)).toEqual([
      'Ближняя атака оружием, досягаемость 5 фт.',
      'Бонус атаки: +7',
      'Попадание: 1d8 + 3 Рубящий + 2d6 Огонь',
      'Промах: половина урона',
    ]);
  });
});
