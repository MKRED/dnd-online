import { describe, expect, it } from 'vitest';
import { formatAbilityStep } from './abilityStepLabels.js';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps, readAbilitySteps } from './abilityStepsCheck.js';

// Примеры из книги 2024 (docs/dnd/attacks-and-saves.md).
const fireBolt: AbilityStep = {
  target: { kind: 'range', feet: 120, longFeet: null },
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  damage: [{ count: 1, die: 10, number: 0, type: 'fire' }],
  addModifier: false,
  onMiss: 'none',
};
const longbow: AbilityStep = {
  target: { kind: 'range', feet: 150, longFeet: 600 },
  check: {
    kind: 'attack',
    attack: 'ranged_weapon',
    bonus: { kind: 'ability', ability: 'dexterity' },
  },
  damage: [{ count: 1, die: 8, number: 0, type: 'piercing' }],
  addModifier: true,
  onMiss: 'none',
};
const flameTongue: AbilityStep = {
  target: { kind: 'reach', feet: 5 },
  check: {
    kind: 'attack',
    attack: 'melee_weapon',
    bonus: { kind: 'fixed', value: 7 },
  },
  damage: [
    { count: 1, die: 8, number: 3, type: 'slashing' },
    { count: 2, die: 6, number: 0, type: 'fire' },
  ],
  addModifier: false,
  onMiss: 'half',
};

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
      { ...fireBolt, damage: [{ count: 0, die: 10, number: 0, type: 'fire' }] },
      { ...fireBolt, damage: [{ count: 1, die: 10, number: 0, type: 'heat' }] },
      { ...fireBolt, damage: [{ count: 1, die: 20, number: 0, type: 'fire' }] },
      // Модификатор к урону при числовом бонусе, половина от пустого урона.
      { ...flameTongue, addModifier: true },
      { ...fireBolt, damage: [], onMiss: 'half' },
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
    // Пока шаг один (этап 5 поднимет предел).
    expect(isAbilitySteps([fireBolt, longbow])).toBe(false);
  });

  it('при чтении пропускает испорченный шаг', () => {
    expect(readAbilitySteps([{ ...fireBolt, onMiss: 'x' }, longbow])).toEqual([
      longbow,
    ]);
    expect(readAbilitySteps(undefined)).toEqual([]);
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
