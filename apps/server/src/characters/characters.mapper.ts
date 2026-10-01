import type {
  AbilityScore,
  Character,
  CharacterFeature,
  SkillProficiency,
} from 'shared';
import type { characters } from '../database/schema/index.js';
import type { CreateCharacterDto } from './dto/create-character.dto.js';

type CharacterRow = typeof characters.$inferSelect;
type NewCharacterRow = typeof characters.$inferInsert;

// DB хранит характеристики плоскими колонками (см. characters.ts), а общий тип Character
// группирует их в abilityScores — маппинг в обе стороны неизбежен, это не лишний слой.
export function toCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    species: row.species,
    background: row.background,
    alignment: row.alignment,
    experiencePoints: row.experiencePoints,
    classes: row.classes,
    proficiencyBonus: row.proficiencyBonus,
    abilityScores: {
      strength: row.strength,
      dexterity: row.dexterity,
      constitution: row.constitution,
      intelligence: row.intelligence,
      wisdom: row.wisdom,
      charisma: row.charisma,
    },
    savingThrowProficiencies: row.savingThrowProficiencies,
    skillProficiencies: row.skillProficiencies,
    armorClass: row.armorClass,
    speed: row.speed,
    hitPointsMax: row.hitPointsMax,
    hitPointsCurrent: row.hitPointsCurrent,
    hitPointsTemp: row.hitPointsTemp,
    deathSaveSuccesses: row.deathSaveSuccesses,
    deathSaveFailures: row.deathSaveFailures,
    heroicInspiration: row.heroicInspiration,
    proficiencies: row.proficiencies,
    weaponMasteries: row.weaponMasteries,
    attacks: row.attacks,
    spellSlots: row.spellSlots,
    spellsKnown: row.spellsKnown,
    inventory: row.inventory,
    currency: row.currency,
    features: row.features,
    personality: row.personality,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toInsertValues(
  userId: string,
  dto: CreateCharacterDto,
): NewCharacterRow {
  return {
    userId,
    name: dto.name,
    species: dto.species,
    background: dto.background,
    alignment: dto.alignment ?? null,
    experiencePoints: dto.experiencePoints,
    classes: dto.classes,
    proficiencyBonus: dto.proficiencyBonus,
    strength: dto.abilityScores.strength,
    dexterity: dto.abilityScores.dexterity,
    constitution: dto.abilityScores.constitution,
    intelligence: dto.abilityScores.intelligence,
    wisdom: dto.abilityScores.wisdom,
    charisma: dto.abilityScores.charisma,
    // Значения элементов уже проверены @IsIn/@ValidateNested в DTO — приведение типов
    // здесь лишь сужает string до конкретных литеральных union из shared.
    savingThrowProficiencies: dto.savingThrowProficiencies as AbilityScore[],
    skillProficiencies: dto.skillProficiencies as SkillProficiency[],
    armorClass: dto.armorClass,
    speed: dto.speed,
    hitPointsMax: dto.hitPointsMax,
    hitPointsCurrent: dto.hitPointsCurrent,
    hitPointsTemp: dto.hitPointsTemp,
    deathSaveSuccesses: dto.deathSaveSuccesses,
    deathSaveFailures: dto.deathSaveFailures,
    heroicInspiration: dto.heroicInspiration,
    proficiencies: dto.proficiencies,
    weaponMasteries: dto.weaponMasteries,
    attacks: dto.attacks,
    spellSlots: dto.spellSlots,
    spellsKnown: dto.spellsKnown,
    inventory: dto.inventory,
    currency: dto.currency,
    features: dto.features as CharacterFeature[] | undefined,
    personality: dto.personality,
  };
}
