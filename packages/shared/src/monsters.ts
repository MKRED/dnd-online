import type { AbilityScore, Skill } from './character.js';
import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';
import type { DamageType } from './damageTypes.js';
import type { ConditionKind } from './effectConditions.js';
import type { SenseDetails } from './effectSenses.js';
import type { MonsterChallenge } from './monsterChallenge.js';

// Каталог монстров (docs/plan/monsters-npcs.md). Категория записи — тип существа, остальной
// стат-блок мастер вводит готовыми числами, как в книге: приложение их не выводит. Размеры,
// типы и их названия — по книге 2024 (docs/dnd/monsters.md). Ключи хранятся в базе:
// добавлять можно, переименовывать — только с миграцией данных.

export const MONSTER_TYPES = [
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
] as const;
export type MonsterType = (typeof MONSTER_TYPES)[number];

export const MONSTER_TYPE_LABELS: Record<MonsterType, string> = {
  aberration: 'Аберрация',
  beast: 'Зверь',
  celestial: 'Небожитель',
  construct: 'Конструкт',
  dragon: 'Дракон',
  elemental: 'Элементаль',
  fey: 'Фея',
  fiend: 'Исчадие',
  giant: 'Великан',
  humanoid: 'Гуманоид',
  monstrosity: 'Чудовище',
  ooze: 'Слизь',
  plant: 'Растение',
  undead: 'Нежить',
};

export const MONSTER_SIZES = [
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'gargantuan',
] as const;
export type MonsterSize = (typeof MONSTER_SIZES)[number];

export const MONSTER_SIZE_LABELS: Record<MonsterSize, string> = {
  tiny: 'Крошечный',
  small: 'Маленький',
  medium: 'Средний',
  large: 'Большой',
  huge: 'Огромный',
  gargantuan: 'Громадный',
};

// Кость хитов по размеру — подсказка формы; формулу мастер вводит сам.
export const MONSTER_SIZE_HIT_DIE: Record<MonsterSize, number> = {
  tiny: 4,
  small: 6,
  medium: 8,
  large: 10,
  huge: 12,
  gargantuan: 20,
};

// Уникальный монстр (босс) на сцене бывает только один. Это правило приложения, не книги;
// проверят его редактор карты и сцена (блоки 3–4).
export const MONSTER_ROLES = ['regular', 'unique'] as const;
export type MonsterRole = (typeof MONSTER_ROLES)[number];

export const MONSTER_ROLE_LABELS: Record<MonsterRole, string> = {
  regular: 'Обычный',
  unique: 'Уникальный',
};

// Особые скорости; null — такой скорости нет. hover — «парит», только при полёте.
export interface MonsterSpeed {
  walk: number;
  burrow: number | null;
  climb: number | null;
  fly: number | null;
  swim: number | null;
  hover: boolean;
}

// «150 (20к10 + 40)»: среднее — готовым числом, формула — по частям, чтобы сцена потом
// бросала хиты каждому экземпляру.
export interface MonsterHitPoints {
  average: number;
  dice: { count: number; die: number; bonus: number };
}

// Колдовство монстра — не способность, а три необязательных числа заголовка «Заклинаний».
export interface MonsterSpellcasting {
  ability: AbilityScore | null;
  saveDc: number | null;
  attackBonus: number | null;
}

export interface MonsterStatBlock {
  size: MonsterSize;
  tags: string;
  alignment: string;
  armorClass: number;
  // Модификатор; значение лист покажет как 10 + модификатор.
  initiative: number;
  hitPoints: MonsterHitPoints;
  speed: MonsterSpeed;
  // save — готовый бонус спасброска, без владения он равен модификатору.
  abilities: Record<AbilityScore, { score: number; save: number }>;
  skills: { skill: Skill; bonus: number }[];
  vulnerabilities: DamageType[];
  resistances: DamageType[];
  immunities: DamageType[];
  conditionImmunities: ConditionKind[];
  senses: SenseDetails[];
  passivePerception: number;
  languages: string;
  challenge: MonsterChallenge;
  // Необязательные: только у монстров с логовом или легендарными действиями.
  lairXp: number | null;
  legendaryActions: number | null;
  legendaryActionsLair: number | null;
  spellcasting: MonsterSpellcasting;
}

export interface MonsterFields {
  category: MonsterType;
  statBlock: MonsterStatBlock;
  role: MonsterRole;
}

export type Monster = MonsterFields & CatalogEntryFields;
export type MonsterInput = MonsterFields & CatalogEntryInputFields;

// Стат-блок записи, у которой он испорчен, и начальные значения формы: Средний, всё по 10,
// хиты — «4 (1к8)», как у простолюдина книги.
export const DEFAULT_MONSTER_STAT_BLOCK: MonsterStatBlock = {
  size: 'medium',
  tags: '',
  alignment: '',
  armorClass: 10,
  initiative: 0,
  hitPoints: { average: 4, dice: { count: 1, die: 8, bonus: 0 } },
  speed: {
    walk: 30,
    burrow: null,
    climb: null,
    fly: null,
    swim: null,
    hover: false,
  },
  abilities: {
    strength: { score: 10, save: 0 },
    dexterity: { score: 10, save: 0 },
    constitution: { score: 10, save: 0 },
    intelligence: { score: 10, save: 0 },
    wisdom: { score: 10, save: 0 },
    charisma: { score: 10, save: 0 },
  },
  skills: [],
  vulnerabilities: [],
  resistances: [],
  immunities: [],
  conditionImmunities: [],
  senses: [],
  passivePerception: 10,
  languages: '',
  challenge: '0',
  lairXp: null,
  legendaryActions: null,
  legendaryActionsLair: null,
  spellcasting: { ability: null, saveDc: null, attackBonus: null },
};
