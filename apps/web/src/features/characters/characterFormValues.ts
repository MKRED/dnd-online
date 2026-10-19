import {
  ABILITY_SCORES,
  ARMOR_TRAINING,
  SKILL_ABILITIES,
  SPECIES_WITH_LINEAGE,
  SUBCLASS_MIN_LEVEL,
  WEAPON_PROFICIENCIES,
  type AbilityScore,
  type ArmorTraining,
  type Character,
  type CharacterClass,
  type CharacterCurrency,
  type CharacterKind,
  type CharacterPersonality,
  type CharacterSpecies,
  type HitDie,
  type Skill,
  type SpellSlotsExpended,
  type WeaponProficiency,
} from 'shared';
import type { CreateCharacterPayload } from './charactersApi';
import {
  emptySpellSlotTotals,
  spellSlotsExpended,
  spellSlotTotals,
  toSpellSlots,
  type SpellSlotTotals,
} from './spellSlotsFormValues';

export interface CharacterFormClassEntry {
  // Синтетический id, не отправляется на бэкенд (см. toCreatePayload) — нужен как
  // стабильный React key для строк списка, независимый от индекса: в uncontrolled-режиме
  // формы поля используют defaultValue, и при удалении строки из середины списка React
  // переиспользует DOM-узлы по ключу, а defaultValue у уже смонтированного input не
  // обновляется — с ключом по индексу это показывало бы "залипшие" старые значения.
  id: string;
  // '' — класс ещё не выбран; форма не даёт отправить такую строку.
  class: CharacterClass | '';
  level: number;
  subclass: string;
}

export interface CharacterFormValues {
  kind: CharacterKind;
  name: string;
  species: CharacterSpecies | '';
  speciesLineage: string;
  background: string;
  alignment: string;
  experiencePoints: number;
  classes: CharacterFormClassEntry[];
  proficiencyBonus: number;
  abilityScores: Record<AbilityScore, number>;
  savingThrows: Record<AbilityScore, boolean>;
  skills: Record<Skill, { proficient: boolean; expertise: boolean }>;
  armorClass: number;
  speed: number;
  hitPointsMax: number;
  hitPointsCurrent: number;
  // Select работает со строками: '' — ещё не выбрана (форма такую не отправит), иначе число граней ('10').
  hitDie: string;
  heroicInspiration: number;
  spellSlots: SpellSlotTotals;
  // Полей для них нет: потраченные отмечаются на листе, форма их только сохраняет.
  spellSlotsExpended: SpellSlotsExpended;
  armorProficiencies: ArmorTraining[];
  weaponProficiencies: WeaponProficiency[];
  toolProficiencies: string[];
  languages: string[];
  otherProficiencies: string;
  weaponMasteries: string[];
  currency: CharacterCurrency;
  personality: CharacterPersonality;
}

function emptyAbilityRecord<T>(value: T): Record<AbilityScore, T> {
  return Object.fromEntries(
    ABILITY_SCORES.map((ability) => [ability, value]),
  ) as Record<AbilityScore, T>;
}

// Тип нового персонажа — от выбранного чипа списка (?kind=npc), в форме его можно сменить.
export function createInitialFormValues(
  kind: CharacterKind = 'pc',
): CharacterFormValues {
  return {
    kind,
    name: '',
    species: '',
    speciesLineage: '',
    background: '',
    alignment: '',
    experiencePoints: 0,
    classes: [{ id: crypto.randomUUID(), class: '', level: 1, subclass: '' }],
    proficiencyBonus: 2,
    abilityScores: emptyAbilityRecord(10),
    savingThrows: emptyAbilityRecord(false),
    skills: Object.fromEntries(
      Object.keys(SKILL_ABILITIES).map((skill) => [
        skill,
        { proficient: false, expertise: false },
      ]),
    ) as Record<Skill, { proficient: boolean; expertise: boolean }>,
    armorClass: 10,
    speed: 30,
    hitPointsMax: 10,
    hitPointsCurrent: 10,
    hitDie: '',
    heroicInspiration: 0,
    spellSlots: emptySpellSlotTotals(),
    spellSlotsExpended: {},
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    languages: [],
    otherProficiencies: '',
    weaponMasteries: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    personality: {},
  };
}

// Обратное к toCreatePayload: заполняет форму редактирования данными персонажа.
export function fromCharacter(character: Character): CharacterFormValues {
  const base = createInitialFormValues();
  for (const ability of character.savingThrowProficiencies) {
    base.savingThrows[ability] = true;
  }
  for (const { skill, expertise } of character.skillProficiencies) {
    base.skills[skill] = { proficient: true, expertise };
  }
  return {
    ...base,
    kind: character.kind,
    name: character.name,
    species: character.species,
    speciesLineage: character.speciesLineage ?? '',
    background: character.background,
    alignment: character.alignment ?? '',
    experiencePoints: character.experiencePoints,
    classes: character.classes.map((entry) => ({
      id: crypto.randomUUID(),
      class: entry.class,
      level: entry.level,
      subclass: entry.subclass ?? '',
    })),
    proficiencyBonus: character.proficiencyBonus,
    abilityScores: { ...character.abilityScores },
    armorClass: character.armorClass,
    speed: character.speed,
    hitPointsMax: character.hitPointsMax,
    hitPointsCurrent: character.hitPointsCurrent,
    hitDie: character.hitDie === null ? '' : String(character.hitDie),
    heroicInspiration: character.heroicInspiration,
    spellSlots: spellSlotTotals(character.spellSlots),
    spellSlotsExpended: spellSlotsExpended(character.spellSlots),
    armorProficiencies: [...character.proficiencies.armor],
    weaponProficiencies: [...character.proficiencies.weapons],
    toolProficiencies: [...character.proficiencies.tools],
    languages: [...character.proficiencies.languages],
    otherProficiencies: character.proficiencies.other ?? '',
    weaponMasteries: [...character.weaponMasteries],
    currency: { ...character.currency },
    personality: { ...character.personality },
  };
}

// undefined вместо пустой строки для необязательных текстовых полей — DTO трактует
// "не заполнено" и "пустая строка" по-разному, а форма всегда даёт ''.
function blankToUndefined(value: string): string | undefined {
  return value.trim() === '' ? undefined : value;
}

export function toCreatePayload(
  values: CharacterFormValues,
): CreateCharacterPayload {
  return {
    kind: values.kind,
    name: values.name.trim(),
    species: values.species as CharacterSpecies,
    speciesLineage: SPECIES_WITH_LINEAGE.includes(
      values.species as CharacterSpecies,
    )
      ? blankToUndefined(values.speciesLineage)
      : undefined,
    background: values.background.trim(),
    alignment: blankToUndefined(values.alignment),
    experiencePoints: values.experiencePoints,
    classes: values.classes.map((entry) => ({
      class: entry.class as CharacterClass,
      level: entry.level,
      subclass:
        entry.level >= SUBCLASS_MIN_LEVEL
          ? blankToUndefined(entry.subclass)
          : undefined,
    })),
    proficiencyBonus: values.proficiencyBonus,
    abilityScores: values.abilityScores,
    savingThrowProficiencies: ABILITY_SCORES.filter(
      (ability) => values.savingThrows[ability],
    ),
    skillProficiencies: (Object.keys(values.skills) as Skill[])
      .filter((skill) => values.skills[skill].proficient)
      .map((skill) => ({
        skill,
        expertise: values.skills[skill].expertise,
      })),
    armorClass: values.armorClass,
    speed: values.speed,
    hitPointsMax: values.hitPointsMax,
    hitPointsCurrent: values.hitPointsCurrent,
    hitDie: Number(values.hitDie) as HitDie,
    heroicInspiration: values.heroicInspiration,
    spellSlots: toSpellSlots(values.spellSlots, values.spellSlotsExpended),
    proficiencies: {
      // Порядок как в справочнике, а не как отмечали галочки.
      armor: ARMOR_TRAINING.filter((category) =>
        values.armorProficiencies.includes(category),
      ),
      weapons: WEAPON_PROFICIENCIES.filter((weapon) =>
        values.weaponProficiencies.includes(weapon),
      ),
      tools: values.toolProficiencies,
      languages: values.languages,
      other: blankToUndefined(values.otherProficiencies),
    },
    weaponMasteries: values.weaponMasteries,
    currency: values.currency,
    personality: {
      traits: blankToUndefined(values.personality.traits ?? ''),
      ideals: blankToUndefined(values.personality.ideals ?? ''),
      bonds: blankToUndefined(values.personality.bonds ?? ''),
      flaws: blankToUndefined(values.personality.flaws ?? ''),
      backstory: blankToUndefined(values.personality.backstory ?? ''),
      appearance: blankToUndefined(values.personality.appearance ?? ''),
    },
  };
}
