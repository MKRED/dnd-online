import { describe, expect, it } from 'vitest';
import { sampleCharacter } from '../../test/characterFixture';
import {
  createInitialFormValues,
  fromCharacter,
  toCreatePayload,
} from './characterFormValues';

describe('fromCharacter', () => {
  it('после toCreatePayload даёт те же поля чарника', () => {
    const payload = toCreatePayload(fromCharacter(sampleCharacter));
    const c = sampleCharacter;
    expect(payload).toEqual({
      kind: c.kind,
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
      spellSlots: c.spellSlots,
      proficiencies: { ...c.proficiencies, other: undefined },
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

  it('сохраняет тип НПС', () => {
    const values = fromCharacter({ ...sampleCharacter, kind: 'npc' });
    expect(toCreatePayload(values).kind).toBe('npc');
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

describe('createInitialFormValues', () => {
  it('новый персонаж — игровой, если тип не задан', () => {
    expect(createInitialFormValues().kind).toBe('pc');
    expect(createInitialFormValues('npc').kind).toBe('npc');
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

  it('отправляет владение доспехами в порядке справочника', () => {
    const values = fromCharacter(sampleCharacter);
    values.armorProficiencies = ['shield', 'light'];
    expect(toCreatePayload(values).proficiencies.armor).toEqual([
      'light',
      'shield',
    ]);
  });

  it('отправляет владение оружием в порядке справочника, а прочие владения — как текст', () => {
    const values = fromCharacter(sampleCharacter);
    values.weaponProficiencies = ['dagger', 'martial'];
    values.otherProficiencies = 'Ездовые животные';
    expect(toCreatePayload(values).proficiencies).toMatchObject({
      weapons: ['martial', 'dagger'],
      other: 'Ездовые животные',
    });
  });

  it('ячейки: число из формы, потраченные — из персонажа, урезанные до нового числа', () => {
    const values = fromCharacter({
      ...sampleCharacter,
      spellSlots: {
        1: { total: 4, expended: 3 },
        2: { total: 3, expended: 1 },
        3: { total: 2, expended: 2 },
      },
    });
    expect(values.spellSlots).toMatchObject({ 1: 4, 2: 3, 3: 2, 4: 0 });
    values.spellSlots[1] = 2;
    values.spellSlots[3] = 0;
    values.spellSlots[5] = 1;
    expect(toCreatePayload(values).spellSlots).toEqual({
      1: { total: 2, expended: 2 },
      2: { total: 3, expended: 1 },
      5: { total: 1, expended: 0 },
    });
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
