// Общие типы чарника DnD 5e (редакция 2024) — используются и на сервере (Drizzle jsonb-колонки), и на фронте (форма создания).

export const ABILITY_SCORES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;
export type AbilityScore = (typeof ABILITY_SCORES)[number];

// Привязка каждого из 18 навыков к характеристике фиксирована правилами — не подлежит настройке пользователем.
export const SKILL_ABILITIES = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
} as const satisfies Record<string, AbilityScore>;
export type Skill = keyof typeof SKILL_ABILITIES;

export interface SkillProficiency {
  skill: Skill;
  expertise: boolean;
}

// Классы редакции 2024: 12 из Player's Handbook и артефактор из Eberron: Forge of the
// Artificer. Это ключи для хранения; русские названия живут в web (characterClasses.ts).
export const CHARACTER_CLASSES = [
  'artificer',
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const;
export type CharacterClass = (typeof CHARACTER_CLASSES)[number];

// В редакции 2024 подкласс у всех классов выбирается на 3-м уровне этого класса.
export const SUBCLASS_MIN_LEVEL = 3;

// Виды редакции 2024 из печатных книг: 10 из Player's Handbook, 5 из Eberron: Forge of the
// Artificer и 4 из Ravenloft: The Horrors Within. Это ключи для хранения; русские названия
// живут в web (characterSpecies.ts).
export const CHARACTER_SPECIES = [
  'aasimar',
  'changeling',
  'dhampir',
  'dragonborn',
  'dwarf',
  'elf',
  'gnome',
  'goliath',
  'halfling',
  'hexblood',
  'human',
  'kalashtar',
  'khoravar',
  'lupin',
  'orc',
  'reborn',
  'shifter',
  'tiefling',
  'warforged',
] as const;
export type CharacterSpecies = (typeof CHARACTER_SPECIES)[number];

// Виды, у которых при создании персонажа выбирают род или наследие (подвидов в редакции
// 2024 нет — это их замена). У остальных видов такого выбора нет. Сами варианты — в web.
export const SPECIES_WITH_LINEAGE: readonly CharacterSpecies[] = [
  'dragonborn',
  'elf',
  'gnome',
  'goliath',
  'shifter',
  'tiefling',
];

// Мультикласс — это список: у персонажа может быть больше одного класса+уровня+подкласса одновременно.
export interface CharacterClassLevel {
  class: CharacterClass;
  level: number;
  // Свободный текст: форма подсказывает официальные подклассы, но хоумбрю и UA не запрещает.
  subclass?: string;
}

export interface SpellSlotLevel {
  total: number;
  expended: number;
}

export type SpellSlots = Partial<
  Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, SpellSlotLevel>
>;

export interface KnownSpell {
  name: string;
  level: number;
  class: string;
  prepared: boolean;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  weight?: number;
  equipped?: boolean;
  attuned?: boolean;
}

export const FEATURE_SOURCES = [
  'class',
  'species',
  'background',
  'feat',
] as const;
export type FeatureSource = (typeof FEATURE_SOURCES)[number];

export interface CharacterFeature {
  name: string;
  source: FeatureSource;
  description?: string;
}

export interface CharacterProficiencies {
  armor: string[];
  weapons: string[];
  tools: string[];
  languages: string[];
}

// Мастерство оружия — новая механика редакции 2024: список оружия, для которого доступно свойство мастерства.
export type WeaponMasteries = string[];

export interface CharacterAttack {
  name: string;
  bonus: string;
  damage: string;
  damageType: string;
  notes?: string;
}

export interface CharacterCurrency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface CharacterPersonality {
  traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  appearance?: string;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  species: CharacterSpecies;
  // Род или наследие вида. Свободный текст, как подкласс: форма подсказывает варианты из книг.
  speciesLineage: string | null;
  background: string;
  alignment: string | null;
  experiencePoints: number;
  classes: CharacterClassLevel[];
  proficiencyBonus: number;
  abilityScores: Record<AbilityScore, number>;
  savingThrowProficiencies: AbilityScore[];
  skillProficiencies: SkillProficiency[];
  armorClass: number;
  speed: number;
  hitPointsMax: number;
  hitPointsCurrent: number;
  hitPointsTemp: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  heroicInspiration: boolean;
  proficiencies: CharacterProficiencies;
  weaponMasteries: WeaponMasteries;
  attacks: CharacterAttack[];
  spellSlots: SpellSlots;
  spellsKnown: KnownSpell[];
  inventory: InventoryItem[];
  currency: CharacterCurrency;
  features: CharacterFeature[];
  personality: CharacterPersonality;
  createdAt: string;
  updatedAt: string;
}
