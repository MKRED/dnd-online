import { describe, expect, it } from 'vitest';
import { toInsertValues, toSheetValues } from './characters.mapper.js';
import type { CreateCharacterDto } from './dto/create-character.dto.js';

// Минимальный payload формы: без полей, которые меняются по ходу игры через PATCH.
const dto = {
  name: 'Арагорн',
  species: 'Человек',
  background: 'Солдат',
  classes: [{ class: 'Следопыт', level: 3 }],
  proficiencyBonus: 2,
  abilityScores: {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
  },
  savingThrowProficiencies: ['strength', 'dexterity'],
  skillProficiencies: [{ skill: 'survival', expertise: false }],
  armorClass: 15,
  speed: 30,
  hitPointsMax: 28,
  hitPointsCurrent: 20,
  proficiencies: { armor: [], weapons: [], tools: [], languages: [] },
  currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
  personality: {},
} as unknown as CreateCharacterDto;

describe('toSheetValues', () => {
  it('maps ability scores to flat columns and nulls a missing alignment', () => {
    const values = toSheetValues(dto);
    expect(values.strength).toBe(15);
    expect(values.charisma).toBe(8);
    expect(values.alignment).toBeNull();
  });

  // Иначе полное редактирование (PUT) затирало бы инвентарь, ХП и т.п.
  it('leaves fields absent from the payload undefined', () => {
    const values = toSheetValues(dto);
    for (const key of [
      'hitPointsTemp',
      'deathSaveSuccesses',
      'deathSaveFailures',
      'attacks',
      'spellSlots',
      'spellsKnown',
      'inventory',
      'features',
    ] as const) {
      expect(values[key]).toBeUndefined();
    }
  });

  it('is what toInsertValues uses, plus the owner', () => {
    expect(toInsertValues('user-1', dto)).toEqual({
      userId: 'user-1',
      ...toSheetValues(dto),
    });
  });
});
