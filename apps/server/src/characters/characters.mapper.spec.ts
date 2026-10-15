import { describe, expect, it } from 'vitest';
import { toInsertValues, toSheetValues } from './characters.mapper.js';
import type { CreateCharacterDto } from './dto/create-character.dto.js';

// Минимальный payload формы: без полей, которые меняются по ходу игры через PATCH.
const dto = {
  name: 'Арагорн',
  species: 'human',
  background: 'Солдат',
  classes: [{ class: 'ranger', level: 3 }],
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
  hitDie: 10,
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

  // Иначе полное редактирование (PUT) затирало бы ХП, заклинания и т.п.
  it('leaves fields absent from the payload undefined', () => {
    const values = toSheetValues(dto);
    for (const key of [
      'hitPointsTemp',
      'deathSaveSuccesses',
      'deathSaveFailures',
      'attacks',
      'spellSlots',
      'spellsKnown',
      'features',
    ] as const) {
      expect(values[key]).toBeUndefined();
    }
  });

  // Доступ по ссылке меняется отдельным запросом; сохранение формы его не сбрасывает,
  // даже если клиент пришлёт поле в теле.
  it('never sets the link access', () => {
    const values = toSheetValues({
      ...dto,
      linkAccess: 'link',
    } as CreateCharacterDto);
    expect(values).not.toHaveProperty('linkAccess');
  });

  it('is what toInsertValues uses, plus the owner', () => {
    expect(toInsertValues('user-1', dto)).toEqual({
      userId: 'user-1',
      ...toSheetValues(dto),
    });
  });
});
