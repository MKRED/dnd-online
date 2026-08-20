import {
  ABILITY_SCORES,
  SKILL_ABILITIES,
  type AbilityScore,
  type CharacterCurrency,
  type CharacterPersonality,
  type Skill,
} from 'shared';
import type { CreateCharacterPayload } from './charactersApi';

export interface CharacterFormClassEntry {
  // Синтетический id, не отправляется на бэкенд (см. toCreatePayload) — нужен как
  // стабильный React key для строк списка, независимый от индекса: в uncontrolled-режиме
  // формы поля используют defaultValue, и при удалении строки из середины списка React
  // переиспользует DOM-узлы по ключу, а defaultValue у уже смонтированного input не
  // обновляется — с ключом по индексу это показывало бы "залипшие" старые значения.
  id: string;
  class: string;
  level: number;
  subclass: string;
}

export interface CharacterFormValues {
  name: string;
  species: string;
  background: string;
  alignment: string;
  experiencePoints: number;
  classes: CharacterFormClassEntry[];
  abilityScores: Record<AbilityScore, number>;
  savingThrows: Record<AbilityScore, boolean>;
  skills: Record<Skill, { proficient: boolean; expertise: boolean }>;
  armorClass: number;
  speed: number;
  hitPointsMax: number;
  hitPointsCurrent: number;
  heroicInspiration: boolean;
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  languages: string[];
  weaponMasteries: string[];
  currency: CharacterCurrency;
  personality: CharacterPersonality;
}

function emptyAbilityRecord<T>(value: T): Record<AbilityScore, T> {
  return Object.fromEntries(
    ABILITY_SCORES.map((ability) => [ability, value]),
  ) as Record<AbilityScore, T>;
}

export function createInitialFormValues(): CharacterFormValues {
  return {
    name: '',
    species: '',
    background: '',
    alignment: '',
    experiencePoints: 0,
    classes: [{ id: crypto.randomUUID(), class: '', level: 1, subclass: '' }],
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
    heroicInspiration: false,
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    languages: [],
    weaponMasteries: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    personality: {},
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
    name: values.name.trim(),
    species: values.species.trim(),
    background: values.background.trim(),
    alignment: blankToUndefined(values.alignment),
    experiencePoints: values.experiencePoints,
    classes: values.classes.map((entry) => ({
      class: entry.class.trim(),
      level: entry.level,
      subclass: blankToUndefined(entry.subclass),
    })),
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
    heroicInspiration: values.heroicInspiration,
    proficiencies: {
      armor: values.armorProficiencies,
      weapons: values.weaponProficiencies,
      tools: values.toolProficiencies,
      languages: values.languages,
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
