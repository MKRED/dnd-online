import { describe, expect, it } from 'vitest';
import { spellcastingNumbers } from './spellcasting.js';

const scores = {
  strength: 8,
  dexterity: 14,
  constitution: 12,
  intelligence: 16,
  wisdom: 9,
  charisma: 10,
};

describe('spellcastingNumbers', () => {
  it('атака — модификатор и бонус мастерства, Сл — ещё 8', () => {
    expect(
      spellcastingNumbers({
        spellcastingAbility: 'intelligence',
        abilityScores: scores,
        proficiencyBonus: 2,
      }),
    ).toEqual({ ability: 'intelligence', attack: 5, saveDc: 13 });
  });

  it('отрицательный модификатор вычитается', () => {
    expect(
      spellcastingNumbers({
        spellcastingAbility: 'wisdom',
        abilityScores: scores,
        proficiencyBonus: 3,
      }),
    ).toEqual({ ability: 'wisdom', attack: 2, saveDc: 10 });
  });

  it('без характеристики — null', () => {
    expect(
      spellcastingNumbers({
        spellcastingAbility: null,
        abilityScores: scores,
        proficiencyBonus: 2,
      }),
    ).toBeNull();
  });
});
