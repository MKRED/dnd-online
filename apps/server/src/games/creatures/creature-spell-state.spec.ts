import { describe, expect, it } from 'vitest';
import {
  creatureSpells,
  expendedOf,
  instanceSlots,
} from './creature-spell-state.js';

describe('creature spell state', () => {
  const copy = { 1: { total: 3, expended: 1 }, 2: { total: 1, expended: 0 } };

  it('без своей строки — потрачено как в копии', () => {
    expect(instanceSlots(copy, null)).toEqual(copy);
  });

  it('своё потраченное, но не больше ячеек: копию могли обновить', () => {
    expect(instanceSlots(copy, { 1: 0, 2: 4 })).toEqual({
      1: { total: 3, expended: 0 },
      2: { total: 1, expended: 1 },
    });
    // Круга, которого в копии больше нет, нет и у экземпляра.
    expect(instanceSlots({ 1: copy[1] }, { 2: 1 })).toEqual({ 1: copy[1] });
  });

  it('у монстра ячеек нет; у НПС — ячейки и отличия подготовки', () => {
    expect(creatureSpells({ slots: null }, undefined)).toBeNull();
    expect(
      creatureSpells(
        { slots: copy },
        { spellSlotsExpended: { 1: 2 }, prepared: { a: true } },
      ),
    ).toEqual({
      slots: { 1: { total: 3, expended: 2 }, 2: copy[2] },
      prepared: { a: true },
    });
    expect(expendedOf(copy)).toEqual({ 1: 1, 2: 0 });
  });
});
