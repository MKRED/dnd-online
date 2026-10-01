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
      background: c.background,
      alignment: undefined,
      experiencePoints: c.experiencePoints,
      classes: [
        { class: 'Следопыт', level: 3, subclass: 'Охотник' },
        { class: 'Воин', level: 1, subclass: undefined },
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
