import {
  CONDITION_KINDS,
  DAMAGE_TYPES,
  DEFAULT_MONSTER_STAT_BLOCK,
  MONSTER_CHALLENGES,
  MONSTER_ROLE_LABELS,
  MONSTER_SIZE_HIT_DIE,
  MONSTER_SIZE_LABELS,
  MONSTER_TYPE_LABELS,
  SENSE_KINDS,
  SKILL_ABILITIES,
  type MonsterInput,
  type MonsterStatBlock,
} from 'shared';
import { fieldLines, labeled, list, sample } from './common.js';

const FIELDS = {
  name: 'название, до 100 символов',
  category: `тип существа: ${labeled(MONSTER_TYPE_LABELS)}`,
  role: `${labeled(MONSTER_ROLE_LABELS)}; уникальный (босс, именной) стоит на карте в одном экземпляре, разные уникальные уживаются`,
  statBlock: 'стат-блок, см. ниже',
  description: 'всё, чему нет поля: описание, мифические действия',
  sources: 'источники — строки, например «Monster Manual 2024, с. 361»',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof MonsterInput, string>;

const STAT_BLOCK = {
  size: `${labeled(MONSTER_SIZE_LABELS)}; кость хитов по размеру: ${Object.entries(
    MONSTER_SIZE_HIT_DIE,
  )
    .map(([s, d]) => `${s} к${d}`)
    .join(', ')}`,
  tags: 'уточнение типа в скобках, например «гоблиноид», или пусто',
  alignment: 'мировоззрение текстом, как в книге',
  armorClass: 'КД',
  initiative: 'модификатор инициативы',
  hitPoints:
    '{average, dice: {count, die, bonus}} — «4 (1к8)» это {average: 4, dice: {count: 1, die: 8, bonus: 0}}',
  speed:
    '{walk, burrow, climb, fly, swim, hover} в футах; null — такой скорости нет; hover — парит (только с fly)',
  abilities:
    'по каждой характеристике {score, save}; save — готовый бонус спасброска (без владения равен модификатору)',
  skills: `[{skill, bonus}], skill: ${list(Object.keys(SKILL_ABILITIES))}`,
  vulnerabilities: `уязвимости, типы урона: ${list(DAMAGE_TYPES)}`,
  resistances: 'сопротивления, те же типы урона',
  immunities: 'иммунитеты к урону, те же типы',
  conditionImmunities: `иммунитеты к состояниям: ${list(CONDITION_KINDS)}`,
  senses: `[{sense, range}], sense: ${list(SENSE_KINDS)}, range в футах`,
  passivePerception: 'пассивная Внимательность',
  languages: 'языки текстом или пусто',
  challenge: `ПО строкой: ${list(MONSTER_CHALLENGES)}`,
  lairXp: 'опыт в логове или null',
  legendaryActions: 'легендарных действий за раунд или null',
  legendaryActionsLair: 'то же в логове или null',
  spellcasting: '{ability, saveDc, attackBonus} колдовства, каждое или null',
} satisfies Record<keyof MonsterStatBlock, string>;

export const monsterGuide = () => [
  'МОНСТР (kind monster)',
  ...fieldLines(FIELDS),
  '',
  'СТАТ-БЛОК (statBlock)',
  ...fieldLines(STAT_BLOCK),
  `Заготовка (простолюдин книги): ${sample(DEFAULT_MONSTER_STAT_BLOCK)}`,
  '',
  'Действия, черты, бонусные действия, реакции и заклинания монстра — способности каталога (format_guide ability, категория monster или spell), привязанные через link_add (owner monster, target ability; perDay — заклинание N раз в день). Снаряжение — предметы через link_add, постоянные эффекты — эффекты.',
];
