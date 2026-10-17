import { describe, expect, it } from 'vitest';
import {
  isSpellDetails,
  spellSlotFits,
  SPELL_COMPONENTS_MAX_LENGTH,
  type SpellDetails,
} from './abilitySpell.js';
import {
  formatSpellDuration,
  formatSpellHeader,
} from './abilitySpellLabels.js';
import { DEFAULT_ABILITY_FIELDS } from './abilityUsage.js';

// Примеры книги 2024 (docs/dnd/spells.md).
const fireball: SpellDetails = {
  level: 3,
  school: 'evocation',
  components: 'В, С, М (шарик из помёта летучей мыши и серы)',
  ritual: false,
  duration: { kind: 'instant' },
};
const holdPerson: SpellDetails = {
  level: 2,
  school: 'enchantment',
  components: 'В, С, М (прямой кусочек железа)',
  ritual: false,
  duration: { kind: 'time', amount: 1, unit: 'minute', concentration: true },
};
const fireBolt: SpellDetails = {
  ...fireball,
  level: 0,
  components: 'В, С',
};
const detectMagic: SpellDetails = {
  level: 1,
  school: 'divination',
  components: '',
  ritual: true,
  duration: { kind: 'time', amount: 10, unit: 'minute', concentration: true },
};
const slot = (minLevel: number) => ({
  ...DEFAULT_ABILITY_FIELDS.costs,
  spellSlot: { minLevel },
});

describe('заклинание', () => {
  it('принимает примеры книги', () => {
    for (const details of [fireball, holdPerson, fireBolt, detectMagic])
      expect(isSpellDetails(details)).toBe(true);
    expect(
      isSpellDetails({ ...fireball, duration: { kind: 'dispelled' } }),
    ).toBe(true);
    expect(isSpellDetails({ ...fireball, duration: { kind: 'special' } })).toBe(
      true,
    );
  });

  it('отказывает неверным полям', () => {
    const bad: unknown[] = [
      null,
      [],
      { ...fireball, level: 10 },
      { ...fireball, level: -1 },
      { ...fireball, level: 1.5 },
      { ...fireball, school: 'chronurgy' },
      { ...fireball, components: 3 },
      { ...fireball, components: 'x'.repeat(SPELL_COMPONENTS_MAX_LENGTH + 1) },
      // Ритуальный заговор: ячейки и так нет.
      { ...fireBolt, ritual: true },
      { ...fireball, duration: { kind: 'permanent' } },
      { ...fireball, duration: { kind: 'instant', amount: 1 } },
      { ...holdPerson, duration: { ...holdPerson.duration, amount: 0 } },
      { ...holdPerson, duration: { ...holdPerson.duration, unit: 'week' } },
      { ...fireball, extra: 1 },
    ];
    for (const details of bad) expect(isSpellDetails(details)).toBe(false);
    const { ritual: _ritual, ...noRitual } = fireball;
    expect(isSpellDetails(noRitual)).toBe(false);
  });

  it('ячейка — ровно круга заклинания, у заговора её нет', () => {
    expect(spellSlotFits(3, slot(3))).toBe(true);
    expect(spellSlotFits(3, DEFAULT_ABILITY_FIELDS.costs)).toBe(true);
    expect(spellSlotFits(0, DEFAULT_ABILITY_FIELDS.costs)).toBe(true);
    expect(spellSlotFits(3, slot(1))).toBe(false);
    expect(spellSlotFits(3, slot(5))).toBe(false);
    expect(spellSlotFits(0, slot(1))).toBe(false);
  });

  it('строки карточки', () => {
    expect(formatSpellHeader(fireball)).toBe('3 круг, воплощение');
    expect(formatSpellHeader(fireBolt)).toBe('Заговор, воплощение');
    expect(formatSpellDuration(fireball.duration)).toBe('Мгновенная');
    expect(formatSpellDuration(holdPerson.duration)).toBe(
      'Концентрация, вплоть до 1 минуты',
    );
    expect(formatSpellDuration({ kind: 'dispelled' })).toBe(
      'Пока не рассеется',
    );
  });
});
