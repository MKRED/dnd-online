import { describe, expect, it } from 'vitest';
import { sampleCharacter } from '../../test/characterFixture';
import { fromCharacter, toCreatePayload } from './characterFormValues';

describe('fromCharacter', () => {
  it('после toCreatePayload даёт те же поля чарника', () => {
    const payload = toCreatePayload(fromCharacter(sampleCharacter));
    const c = sampleCharacter;
    expect(payload).toEqual({
      name: c.name,
      species: c.species,
      speciesLineage: undefined,
      background: c.background,
      alignment: undefined,
      experiencePoints: c.experiencePoints,
      classes: [
        { class: 'ranger', level: 3, subclass: 'Охотник' },
        { class: 'fighter', level: 1, subclass: undefined },
      ],
      proficiencyBonus: c.proficiencyBonus,
      abilityScores: c.abilityScores,
      savingThrowProficiencies: c.savingThrowProficiencies,
      // Порядок навыков задаётся формой (SKILL_ABILITIES), а не исходным массивом.
      skillProficiencies: expect.arrayContaining(
        c.skillProficiencies,
      ) as unknown,
      armorClass: c.armorClass,
      speed: c.speed,
      hitPointsMax: c.hitPointsMax,
      hitPointsCurrent: c.hitPointsCurrent,
      hitDie: c.hitDie,
      heroicInspiration: c.heroicInspiration,
      proficiencies: c.proficiencies,
      weaponMasteries: c.weaponMasteries,
      currency: c.currency,
      personality: {
        traits: 'Молчалив',
        ideals: undefined,
        bonds: undefined,
        flaws: undefined,
        backstory: 'Долгая история',
        appearance: undefined,
      },
    });
    expect(payload.skillProficiencies).toHaveLength(2);
  });

  it('даёт строкам классов разные id, а пустое мировоззрение — пустой строкой', () => {
    const values = fromCharacter(sampleCharacter);
    expect(values.alignment).toBe('');
    expect(values.classes[0].id).not.toBe(values.classes[1].id);
  });

  it('не делит вложенные объекты с исходным персонажем', () => {
    const values = fromCharacter(sampleCharacter);
    values.currency.gp = 0;
    values.languages.push('Дварфийский');
    expect(sampleCharacter.currency.gp).toBe(30);
    expect(sampleCharacter.proficiencies.languages).toHaveLength(2);
  });
});

describe('toCreatePayload', () => {
  it('отправляет род только у вида, где он есть', () => {
    const values = fromCharacter(sampleCharacter);
    values.speciesLineage = 'Дроу';
    values.species = 'elf';
    expect(toCreatePayload(values).speciesLineage).toBe('Дроу');
    values.species = 'human';
    expect(toCreatePayload(values).speciesLineage).toBeUndefined();
  });

  it('не отправляет подкласс, пока уровень класса ниже 3-го', () => {
    const values = fromCharacter(sampleCharacter);
    values.classes = [
      { id: 'a', class: 'wizard', level: 2, subclass: 'Прорицатель' },
      { id: 'b', class: 'rogue', level: 3, subclass: 'Вор' },
    ];
    expect(toCreatePayload(values).classes).toEqual([
      { class: 'wizard', level: 2, subclass: undefined },
      { class: 'rogue', level: 3, subclass: 'Вор' },
    ]);
  });
});
