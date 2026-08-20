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

// Мультикласс — это список: у персонажа может быть больше одного класса+уровня+подкласса одновременно.
export interface CharacterClassLevel {
  class: string;
  level: number;
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
  species: string;
  background: string;
  alignment: string | null;
  experiencePoints: number;
  classes: CharacterClassLevel[];
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
}
