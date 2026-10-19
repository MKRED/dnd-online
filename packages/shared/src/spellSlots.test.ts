import { describe, expect, it } from 'vitest';
import { longRestExpended, spendSpellSlots } from './spellSlots.js';

const slots = { 1: { total: 4, expended: 1 }, 2: { total: 2, expended: 0 } };

describe('spendSpellSlots', () => {
  it('меняет только присланные круги', () => {
    expect(spendSpellSlots(slots, { 2: 2 })).toEqual({
      ok: true,
      slots: { 1: { total: 4, expended: 1 }, 2: { total: 2, expended: 2 } },
    });
  });

  it('потратить больше, чем ячеек, нельзя', () => {
    expect(spendSpellSlots(slots, { 1: 2, 2: 3 })).toEqual({
      ok: false,
      level: 2,
    });
  });

  it('у круга без ячеек можно только ноль, и он круг не добавляет', () => {
    expect(spendSpellSlots(slots, { 3: 1 })).toEqual({ ok: false, level: 3 });
    expect(spendSpellSlots(slots, { 3: 0 })).toEqual({ ok: true, slots });
  });

  it('не меняет переданные ячейки', () => {
    const before = structuredClone(slots);
    spendSpellSlots(slots, { 1: 4 });
    expect(slots).toEqual(before);
  });
});

describe('longRestExpended', () => {
  it('нули по кругам, где ячейки есть', () => {
    expect(longRestExpended(slots)).toEqual({ 1: 0, 2: 0 });
    expect(spendSpellSlots(slots, longRestExpended(slots))).toEqual({
      ok: true,
      slots: { 1: { total: 4, expended: 0 }, 2: { total: 2, expended: 0 } },
    });
  });
});
