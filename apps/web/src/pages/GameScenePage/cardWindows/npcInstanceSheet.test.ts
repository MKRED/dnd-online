import { describe, expect, it } from 'vitest';
import type { Character } from 'shared';
import { npcInstanceSheet } from './npcInstanceSheet';

describe('npcInstanceSheet', () => {
  const record = {
    spellSlots: { 1: { total: 2, expended: 0 } },
    abilities: [
      { id: 'shield', prepared: false },
      { id: 'sleep', prepared: true },
    ],
  } as unknown as Character;

  it('ячейки и отличия подготовки — экземпляра, остальное — копии', () => {
    const sheet = npcInstanceSheet(record, {
      slots: { 1: { total: 2, expended: 1 } },
      prepared: { shield: true },
    });
    expect(sheet.spellSlots).toEqual({ 1: { total: 2, expended: 1 } });
    expect(sheet.abilities.map((a) => a.prepared)).toEqual([true, true]);
  });

  it('без состояния экземпляра — копия как есть', () => {
    expect(npcInstanceSheet(record, null)).toBe(record);
  });
});
