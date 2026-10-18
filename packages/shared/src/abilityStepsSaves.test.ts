import { describe, expect, it } from 'vitest';
import { formatAbilityStep } from './abilityStepLabels.js';
import type { AbilityStep } from './abilitySteps.js';
import { isAbilitySteps } from './abilityStepsCheck.js';

// Спасброски, области и шаги без проверки — примеры из книги 2024
// (docs/dnd/attacks-and-saves.md).
const fire = (count: number, die: 6 | 8) => ({
  count,
  die,
  number: 0,
  type: 'fire' as const,
});
const fireball: AbilityStep = {
  when: 'always',
  times: 1,
  target: {
    kind: 'area',
    area: { shape: 'sphere', radius: 20 },
    origin: { kind: 'point', feet: 150 },
  },
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: { damage: [fire(8, 6)], addModifier: false },
  miss: { damage: 'half' },
  growth: { damage: [], times: 0 },
};
const breath: AbilityStep = {
  ...fireball,
  target: {
    kind: 'area',
    area: { shape: 'line', length: 30, width: 5 },
    origin: { kind: 'self' },
  },
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'constitution' },
  },
};
const sacredFlame: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 60, longFeet: null },
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'fixed', value: 13 },
  },
  hit: {
    damage: [{ count: 1, die: 8, number: 0, type: 'radiant' }],
    addModifier: false,
  },
  miss: { damage: 'none' },
  growth: { damage: [], times: 0 },
};
const magicMissile: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 120, longFeet: null },
  check: { kind: 'none' },
  hit: {
    damage: [{ count: 3, die: 4, number: 3, type: 'force' }],
    addModifier: false,
  },
  miss: { damage: 'none' },
  growth: { damage: [], times: 0 },
};
const area = (
  shape: object,
  origin: object = { kind: 'self' },
): AbilityStep => ({
  ...fireball,
  target: { kind: 'area', area: shape, origin } as AbilityStep['target'],
});

describe('спасбросок, область, без проверки', () => {
  it('принимает примеры из книги и все шесть фигур', () => {
    const shapes = [
      { shape: 'cone', length: 15 },
      { shape: 'cube', size: 15 },
      { shape: 'cylinder', radius: 5, height: 40 },
      { shape: 'emanation', distance: 15 },
      { shape: 'line', length: 100, width: 5 },
      { shape: 'sphere', radius: 20 },
    ];
    for (const step of [
      fireball,
      breath,
      sacredFlame,
      magicMissile,
      { ...magicMissile, target: { kind: 'self' } },
      ...shapes.map((shape) => area(shape)),
    ]) {
      expect(isAbilitySteps([step])).toBe(true);
    }
  });

  it('отказывает неверным', () => {
    const bad: unknown[] = [
      // Эманация не из точки; цилиндр без высоты; ширина не кратна 5; лишний размер.
      area({ shape: 'emanation', distance: 15 }, { kind: 'point', feet: 30 }),
      area({ shape: 'cylinder', radius: 5 }),
      area({ shape: 'line', length: 100, width: 3 }),
      area({ shape: 'sphere', radius: 20, length: 5 }),
      area({ shape: 'ring', radius: 20 }),
      // Спасбросок на себя, область у атаки, дальняя дистанция у спасброска.
      { ...sacredFlame, target: { kind: 'self' } },
      {
        ...fireball,
        check: {
          kind: 'attack',
          attack: 'ranged_spell',
          bonus: { kind: 'ability', ability: 'spellcasting' },
        },
      },
      { ...sacredFlame, target: { kind: 'range', feet: 60, longFeet: 120 } },
      // Сл вне пределов, «Сила или Ловкость» у Сл, неизвестная характеристика.
      {
        ...sacredFlame,
        check: { ...sacredFlame.check, dc: { kind: 'fixed', value: 31 } },
      },
      {
        ...fireball,
        check: {
          ...fireball.check,
          dc: { kind: 'ability', ability: 'finesse' },
        },
      },
      { ...fireball, check: { ...fireball.check, ability: 'spellcasting' } },
      // Модификатор к урону у спасброска; половина без проверки; лишнее поле у «без проверки».
      { ...fireball, hit: { ...fireball.hit, addModifier: true } },
      { ...magicMissile, miss: { damage: 'half' } },
      { ...magicMissile, check: { kind: 'none', ability: 'dexterity' } },
    ];
    for (const step of bad) expect(isAbilitySteps([step])).toBe(false);
  });

  it('строки карточки', () => {
    expect(formatAbilityStep(fireball)).toEqual([
      'Спасбросок Ловкости, сфера радиусом 20 фт. в точке в пределах 150 фт.',
      'Сл 8 + модификатор заклинательной характеристики + бонус мастерства',
      'Провал: 8d6 Огонь',
      'Успех: половина урона',
    ]);
    expect(formatAbilityStep(breath)[0]).toBe(
      'Спасбросок Ловкости, линия 30 фт. длиной и 5 фт. шириной от себя',
    );
    expect(formatAbilityStep(sacredFlame)).toEqual([
      'Спасбросок Ловкости, 60 фт.',
      'Сл 13',
      'Провал: 1d8 Излучение',
    ]);
    expect(formatAbilityStep(magicMissile)).toEqual([
      'Без проверки, 120 фт.',
      'Урон: 3d4 + 3 Силовой',
    ]);
  });
});
