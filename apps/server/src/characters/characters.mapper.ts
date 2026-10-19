import type {
  AbilityScore,
  Character,
  CharacterAbilityEntry,
  CharacterFeature,
  CharacterEffectEntry,
  CharacterMainImage,
  InventoryEntry,
  SkillProficiency,
} from 'shared';
import type { characters } from '../database/schema/index.js';
import type { CreateCharacterDto } from './dto/create-character.dto.js';

type CharacterRow = typeof characters.$inferSelect;
type NewCharacterRow = typeof characters.$inferInsert;

// DB хранит характеристики плоскими колонками (см. characters.ts), а общий тип Character
// группирует их в abilityScores — маппинг в обе стороны неизбежен, это не лишний слой.
// mainImage приходит отдельным запросом к галерее (loadMainImages), инвентарь — из
// character_items глазами смотрящего (loadInventories), эффекты — из character_effects так же
// (loadCharacterEffectLists), способности — из character_abilities так же, ник автора — из users: в строке
// персонажа их нет.
export function toCharacter(
  row: CharacterRow,
  {
    mainImage,
    authorNickname,
    inventory,
    effects,
    abilities,
  }: {
    mainImage: CharacterMainImage | null;
    authorNickname: string;
    inventory: InventoryEntry[];
    effects: CharacterEffectEntry[];
    abilities: CharacterAbilityEntry[];
  },
): Character {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    species: row.species,
    speciesLineage: row.speciesLineage,
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
    hitDie: row.hitDie,
    deathSaveSuccesses: row.deathSaveSuccesses,
    deathSaveFailures: row.deathSaveFailures,
    heroicInspiration: row.heroicInspiration,
    proficiencies: row.proficiencies,
    weaponMasteries: row.weaponMasteries,
    attacks: row.attacks,
    spellSlots: row.spellSlots,
    spellsKnown: row.spellsKnown,
    inventory,
    effects,
    abilities,
    currency: row.currency,
    features: row.features,
    personality: row.personality,
    mainImage,
    linkAccess: row.linkAccess,
    authorNickname,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toInsertValues(
  userId: string,
  dto: CreateCharacterDto,
): NewCharacterRow {
  return { userId, ...toSheetValues(dto) };
}

// Поля чарника из DTO — общая часть создания и полного редактирования (PUT).
// Необязательные поля, которых нет в DTO, остаются undefined: drizzle пропускает
// такие ключи в .set(), поэтому при редактировании они не затираются (то, что меняется
// по ходу игры через PATCH — спасброски от смерти и т.п. — форма не шлёт).
// В DTO не должно быть инициализаторов по умолчанию (`= []`), иначе это сломается.
export function toSheetValues(
  dto: CreateCharacterDto,
): Omit<NewCharacterRow, 'userId'> {
  return {
    name: dto.name,
    species: dto.species,
    // null, а не undefined: при смене вида прежний род должен стереться.
    speciesLineage: dto.speciesLineage ?? null,
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
    hitDie: dto.hitDie,
    deathSaveSuccesses: dto.deathSaveSuccesses,
    deathSaveFailures: dto.deathSaveFailures,
    heroicInspiration: dto.heroicInspiration,
    proficiencies: dto.proficiencies,
    weaponMasteries: dto.weaponMasteries,
    attacks: dto.attacks,
    spellSlots: dto.spellSlots,
    spellsKnown: dto.spellsKnown,
    currency: dto.currency,
    features: dto.features as CharacterFeature[] | undefined,
    personality: dto.personality,
  };
}
