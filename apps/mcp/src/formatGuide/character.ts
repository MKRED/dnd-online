import {
  ABILITY_SCORES,
  ARMOR_TRAINING,
  CHARACTER_CLASSES,
  CHARACTER_SPECIES,
  FEATURE_SOURCES,
  HIT_DICE,
  PROFICIENCY_BONUS_MAX,
  PROFICIENCY_BONUS_MIN,
  SKILL_ABILITIES,
  SPECIES_WITH_LINEAGE,
  TURN_ACTIONS_MAX,
  TURN_ACTIONS_MIN,
  WEAPON_PROFICIENCIES,
  type Character,
  type CharacterKind,
} from 'shared';
import { fieldLines, list } from './common.js';

type CharacterInputKey = Exclude<
  keyof Character,
  | 'id'
  | 'userId'
  | 'inventory'
  | 'effects'
  | 'abilities'
  | 'mainImage'
  | 'linkAccess'
  | 'authorNickname'
  | 'sheetLock'
  | 'createdAt'
  | 'updatedAt'
>;

const FIELDS = {
  kind: 'pc или npc — create ставит по kind инструмента',
  name: 'имя, до 100 символов (обязательно)',
  species: `вид (обязательно): ${list(CHARACTER_SPECIES)}`,
  speciesLineage: `род или наследие текстом, только у ${list(SPECIES_WITH_LINEAGE)}; иначе не задавай`,
  background: 'предыстория текстом (обязательно)',
  alignment: 'мировоззрение текстом, необязательно',
  experiencePoints: 'опыт, по умолчанию 0',
  classes: `[{class, level, subclass?}] — хотя бы один (обязательно); class: ${list(CHARACTER_CLASSES)}`,
  proficiencyBonus: `бонус мастерства ${PROFICIENCY_BONUS_MIN}..${PROFICIENCY_BONUS_MAX} (обязательно)`,
  abilityScores: `{${list(ABILITY_SCORES)}} — значения характеристик (обязательно)`,
  savingThrowProficiencies:
    'характеристики с владением спасброском (обязательно, можно [])',
  skillProficiencies: `[{skill, expertise}] (обязательно, можно []), skill: ${list(Object.keys(SKILL_ABILITIES))}`,
  armorClass:
    'КД без доспеха и эффектов (обязательно): 10 + Ловкость или своя защита без доспеха; доспех и щит на кукле лист прибавит сам',
  speed: 'скорость в футах (обязательно)',
  hitPointsMax: 'максимум хитов (обязательно)',
  hitPointsCurrent: 'текущие хиты, не больше максимума (обязательно)',
  hitPointsTemp: 'временные хиты, по умолчанию 0',
  hitDie: `кость хитов: ${list(HIT_DICE)} (обязательно)`,
  deathSaveSuccesses: 'успехи спасбросков от смерти 0..3',
  deathSaveFailures: 'провалы 0..3',
  heroicInspiration: 'героическое вдохновение числом',
  actionCount: `действий за ход ${TURN_ACTIONS_MIN}..${TURN_ACTIONS_MAX}, по умолчанию 1 (по книге у всех 1)`,
  bonusActionCount: `бонусных действий за ход ${TURN_ACTIONS_MIN}..${TURN_ACTIONS_MAX}, по умолчанию 1`,
  reactionCount: `реакций за раунд ${TURN_ACTIONS_MIN}..${TURN_ACTIONS_MAX}, по умолчанию 1`,
  proficiencies: `{armor, weapons, tools, languages, other?} (обязательно); armor: ${list(ARMOR_TRAINING)}; weapons: ${list(WEAPON_PROFICIENCIES)}; tools и languages — строки`,
  weaponMasteries: 'оружие с доступным мастерством — строки',
  attacks: '[{name, bonus, damage, damageType, notes?}] — строки, как на листе',
  spellSlots:
    '{"1": {total, expended}, …} — ячейки по кругам из таблицы класса',
  spellsKnown:
    '[{name, level, class, prepared}] — заклинания текстом; лучше привязать способности каталога через link_add',
  currency: '{cp, sp, ep, gp, pp} (обязательно)',
  features: `[{name, source, description?}], source: ${list(FEATURE_SOURCES)}`,
  personality:
    '{traits?, ideals?, bonds?, flaws?, backstory?, appearance?} (обязательно, можно {})',
} satisfies Record<CharacterInputKey, string>;

export const characterGuide = (kind: CharacterKind) => [
  kind === 'npc'
    ? 'НПС (kind npc) — лист как у персонажа игрока; НПС из бестиария переносят с бонусом мастерства до +9'
    : 'ПЕРСОНАЖ ИГРОКА (kind character)',
  ...fieldLines(FIELDS),
  '',
  'Способности, предметы и эффекты — записи каталога, привязанные через link_add (owner character или npc).',
];
