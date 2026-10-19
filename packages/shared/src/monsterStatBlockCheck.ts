import { ABILITY_SCORES, SKILL_ABILITIES } from './character.js';
import { DAMAGE_TYPES } from './damageTypes.js';
import { CONDITION_KINDS } from './effectConditions.js';
import { isSenseDetails, type SenseDetails } from './effectSenses.js';
import { SPEED_FEET_MAX, SPEED_FEET_STEP } from './effectSpeed.js';
import { isMonsterChallenge } from './monsterChallenge.js';
import { MONSTER_SIZES, type MonsterStatBlock } from './monsters.js';

// Проверка стат-блока монстра: тело запроса и jsonb из базы, только известные поля и
// значения. Пределы чисел — приложения, а не книги: с запасом над самыми большими
// монстрами книги 2024 (docs/dnd/monsters.md, «In the app»).
export const MONSTER_TAGS_MAX_LENGTH = 100;
export const MONSTER_ALIGNMENT_MAX_LENGTH = 30;
export const MONSTER_LANGUAGES_MAX_LENGTH = 300;
export const MONSTER_ARMOR_CLASS_MAX = 50;
// Бонусы: инициатива, спасброски, навыки, атака заклинанием.
export const MONSTER_BONUS_MIN = -10;
export const MONSTER_BONUS_MAX = 30;
export const MONSTER_ABILITY_SCORE_MAX = 30;
export const MONSTER_HIT_POINTS_MAX = 9999;
export const MONSTER_HIT_DICE_COUNT_MAX = 999;
export const MONSTER_HIT_DICE = [4, 6, 8, 10, 12, 20] as const;
export const MONSTER_HIT_BONUS_MIN = -999;
export const MONSTER_PASSIVE_PERCEPTION_MAX = 50;
export const MONSTER_SAVE_DC_MAX = 40;
export const MONSTER_LAIR_XP_MAX = 1_000_000;
export const MONSTER_LEGENDARY_ACTIONS_MAX = 10;

type Obj = Record<string, unknown>;

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const hasKeys = (value: Obj, keys: string) =>
  Object.keys(value).sort().join(',') === keys;
const isInt = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;
const isIntOrNull = (value: unknown, min: number, max: number) =>
  value === null || isInt(value, min, max);
const isBonus = (value: unknown) =>
  isInt(value, MONSTER_BONUS_MIN, MONSTER_BONUS_MAX);
const isText = (value: unknown, max: number) =>
  typeof value === 'string' && value.length <= max;

// Список из готовых ключей, каждый — один раз.
function isUniqueList(value: unknown, list: readonly string[]) {
  if (!Array.isArray(value)) return false;
  return (
    value.every((v) => list.includes(v as string)) &&
    new Set(value).size === value.length
  );
}

const isSpeedFeetOrNull = (value: unknown) =>
  value === null ||
  (isInt(value, SPEED_FEET_STEP, SPEED_FEET_MAX) &&
    (value as number) % SPEED_FEET_STEP === 0);

function isSpeed(value: unknown) {
  if (!isObj(value) || !hasKeys(value, 'burrow,climb,fly,hover,swim,walk'))
    return false;
  // Ходьба бывает 0 (у летающих и плавающих), остальные — null или число.
  const walk = value.walk;
  return (
    isInt(walk, 0, SPEED_FEET_MAX) &&
    (walk as number) % SPEED_FEET_STEP === 0 &&
    ['burrow', 'climb', 'fly', 'swim'].every((k) =>
      isSpeedFeetOrNull(value[k]),
    ) &&
    typeof value.hover === 'boolean' &&
    (!value.hover || value.fly !== null)
  );
}

function isHitPoints(value: unknown) {
  if (!isObj(value) || !hasKeys(value, 'average,dice')) return false;
  const dice = value.dice;
  return (
    isInt(value.average, 1, MONSTER_HIT_POINTS_MAX) &&
    isObj(dice) &&
    hasKeys(dice, 'bonus,count,die') &&
    isInt(dice.count, 1, MONSTER_HIT_DICE_COUNT_MAX) &&
    MONSTER_HIT_DICE.includes(dice.die as 4) &&
    isInt(dice.bonus, MONSTER_HIT_BONUS_MIN, MONSTER_HIT_POINTS_MAX)
  );
}

function isAbilities(value: unknown) {
  if (!isObj(value) || !hasKeys(value, [...ABILITY_SCORES].sort().join(',')))
    return false;
  return ABILITY_SCORES.every((ability) => {
    const entry = value[ability];
    return (
      isObj(entry) &&
      hasKeys(entry, 'save,score') &&
      isInt(entry.score, 1, MONSTER_ABILITY_SCORE_MAX) &&
      isBonus(entry.save)
    );
  });
}

function isSkills(value: unknown) {
  if (!Array.isArray(value)) return false;
  const skills = value.map((entry: unknown) =>
    isObj(entry) &&
    hasKeys(entry, 'bonus,skill') &&
    typeof entry.skill === 'string' &&
    Object.hasOwn(SKILL_ABILITIES, entry.skill) &&
    isBonus(entry.bonus)
      ? entry.skill
      : null,
  );
  return !skills.includes(null) && new Set(skills).size === skills.length;
}

// Каждое чувство — один раз, как в составляющей эффекта.
function isSenses(value: unknown) {
  if (!Array.isArray(value) || !value.every(isSenseDetails)) return false;
  const kinds = (value as SenseDetails[]).map((s) => s.sense);
  return new Set(kinds).size === kinds.length;
}

function isSpellcasting(value: unknown) {
  if (!isObj(value) || !hasKeys(value, 'ability,attackBonus,saveDc'))
    return false;
  return (
    (value.ability === null ||
      ABILITY_SCORES.includes(value.ability as 'strength')) &&
    isIntOrNull(value.saveDc, 1, MONSTER_SAVE_DC_MAX) &&
    (value.attackBonus === null || isBonus(value.attackBonus))
  );
}

const STAT_BLOCK_KEYS = [
  'abilities',
  'alignment',
  'armorClass',
  'challenge',
  'conditionImmunities',
  'hitPoints',
  'immunities',
  'initiative',
  'lairXp',
  'languages',
  'legendaryActions',
  'legendaryActionsLair',
  'passivePerception',
  'resistances',
  'senses',
  'size',
  'skills',
  'speed',
  'spellcasting',
  'tags',
  'vulnerabilities',
].join(',');

export function isMonsterStatBlock(value: unknown): value is MonsterStatBlock {
  if (!isObj(value) || !hasKeys(value, STAT_BLOCK_KEYS)) return false;
  const v = value;
  return (
    MONSTER_SIZES.includes(v.size as 'tiny') &&
    isText(v.tags, MONSTER_TAGS_MAX_LENGTH) &&
    isText(v.alignment, MONSTER_ALIGNMENT_MAX_LENGTH) &&
    isInt(v.armorClass, 1, MONSTER_ARMOR_CLASS_MAX) &&
    isBonus(v.initiative) &&
    isHitPoints(v.hitPoints) &&
    isSpeed(v.speed) &&
    isAbilities(v.abilities) &&
    isSkills(v.skills) &&
    isUniqueList(v.vulnerabilities, DAMAGE_TYPES) &&
    isUniqueList(v.resistances, DAMAGE_TYPES) &&
    isUniqueList(v.immunities, DAMAGE_TYPES) &&
    isUniqueList(v.conditionImmunities, CONDITION_KINDS) &&
    isSenses(v.senses) &&
    isInt(v.passivePerception, 0, MONSTER_PASSIVE_PERCEPTION_MAX) &&
    isText(v.languages, MONSTER_LANGUAGES_MAX_LENGTH) &&
    isMonsterChallenge(v.challenge) &&
    isIntOrNull(v.lairXp, 0, MONSTER_LAIR_XP_MAX) &&
    isIntOrNull(v.legendaryActions, 1, MONSTER_LEGENDARY_ACTIONS_MAX) &&
    isIntOrNull(v.legendaryActionsLair, 1, MONSTER_LEGENDARY_ACTIONS_MAX) &&
    // Число в логове — только у монстра с легендарными действиями.
    (v.legendaryActionsLair === null || v.legendaryActions !== null) &&
    isSpellcasting(v.spellcasting)
  );
}
