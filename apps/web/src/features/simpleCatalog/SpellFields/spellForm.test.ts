import { DEFAULT_ABILITY_FIELDS, type SpellDetails } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  fromSpellValues,
  spellCosts,
  spellValidate,
  toSpellValues,
} from './spellForm';
import { suggestedSlotOn } from './spellSlot';

const holdPerson: SpellDetails = {
  level: 2,
  school: 'enchantment',
  components: 'В, С, М (прямой кусочек железа)',
  ritual: false,
  duration: { kind: 'time', amount: 1, unit: 'minute', concentration: true },
};

describe('spellForm', () => {
  it('туда и обратно без потерь', () => {
    expect(fromSpellValues(toSpellValues(holdPerson))).toEqual(holdPerson);
    const instant = { ...holdPerson, duration: { kind: 'instant' as const } };
    expect(fromSpellValues(toSpellValues(instant))).toEqual(instant);
  });

  it('новое — 1 круга без школы; поля времени остаются при смене вида', () => {
    expect(toSpellValues()).toMatchObject({ level: '1', school: '' });
    const values = toSpellValues(holdPerson);
    const changed = {
      ...values,
      duration: { ...values.duration, kind: 'special' as const },
    };
    expect(fromSpellValues(changed).duration).toEqual({ kind: 'special' });
    expect(changed.duration.concentration).toBe(true);
  });

  it('ритуал и пробелы компонентов у заговора не уходят', () => {
    const values = {
      ...toSpellValues(holdPerson),
      level: '0',
      ritual: true,
      components: '  В, С  ',
    };
    expect(fromSpellValues(values)).toMatchObject({
      level: 0,
      ritual: false,
      components: 'В, С',
    });
  });

  it('ячейка в затратах — круга заклинания, у заговора её нет', () => {
    const costs = {
      ...DEFAULT_ABILITY_FIELDS.costs,
      spellSlot: { minLevel: 1 },
    };
    expect(spellCosts(costs, 3).spellSlot).toEqual({ minLevel: 3 });
    expect(spellCosts(costs, 0).spellSlot).toBeNull();
    expect(spellCosts(DEFAULT_ABILITY_FIELDS.costs, 3).spellSlot).toBeNull();
  });

  it('подставляет ячейку, когда заклинание появилось, и не трогает снятую', () => {
    expect(suggestedSlotOn(3, null, false)).toBe(true);
    expect(suggestedSlotOn(3, 0, false)).toBe(true);
    expect(suggestedSlotOn(0, 2, true)).toBe(false);
    // Сняли нарочно (от черты) и сменили круг — так и остаётся.
    expect(suggestedSlotOn(3, 2, false)).toBe(false);
    expect(suggestedSlotOn(3, 2, true)).toBe(true);
  });

  it('проверки — только у заклинания', () => {
    const spell = { category: 'spell', spell: toSpellValues() };
    expect(spellValidate.school('', spell)).toBe('Выберите школу');
    expect(spellValidate.school('', { category: 'basic' })).toBeNull();
    expect(spellValidate.components('x'.repeat(501), spell)).toBe(
      'Не длиннее 500 символов',
    );
    const timed = {
      category: 'spell',
      spell: {
        ...spell.spell,
        duration: { ...spell.spell.duration, kind: 'time' as const },
      },
    };
    expect(spellValidate.duration.amount(0, timed)).toBe('От 1 до 999');
    expect(spellValidate.duration.amount(0, spell)).toBeNull();
  });
});
