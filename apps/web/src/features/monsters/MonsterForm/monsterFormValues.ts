import {
  ABILITY_SCORES,
  DEFAULT_MONSTER_STAT_BLOCK,
  senseHasRange,
  type AbilityScore,
  type ConditionKind,
  type DamageType,
  type Monster,
  type MonsterChallenge,
  type MonsterInput,
  type MonsterRole,
  type MonsterSize,
  type MonsterType,
  type SenseKind,
  type Skill,
} from 'shared';
import { toSourcesInput } from '../../catalog';

// Пустое поле NumberInput отдаёт '' — в форме число или строка, в запрос уходит число
// или null (у необязательных полей).
export type NumValue = number | string;

export interface MonsterSkillValues {
  // Ключ строки списка: строки добавляют и убирают, а React должен отличать их.
  id: string;
  skill: Skill | '';
  bonus: NumValue;
}

export interface MonsterSenseValues {
  id: string;
  sense: SenseKind | '';
  range: NumValue;
}

// Значения формы монстра повторяют стат-блок (MonsterStatBlock), но числа в них — как
// в полях ввода, а у необязательных пусто вместо null. Источники форма держит отдельно.
export interface MonsterFormValues {
  name: string;
  category: MonsterType;
  role: MonsterRole;
  size: MonsterSize;
  tags: string;
  alignment: string;
  challenge: MonsterChallenge;
  lairXp: NumValue;
  armorClass: NumValue;
  initiative: NumValue;
  hitPoints: {
    average: NumValue;
    count: NumValue;
    die: string;
    bonus: NumValue;
  };
  speed: {
    walk: NumValue;
    burrow: NumValue;
    climb: NumValue;
    fly: NumValue;
    swim: NumValue;
    hover: boolean;
  };
  abilities: Record<AbilityScore, { score: NumValue; save: NumValue }>;
  skills: MonsterSkillValues[];
  vulnerabilities: DamageType[];
  resistances: DamageType[];
  immunities: DamageType[];
  conditionImmunities: ConditionKind[];
  senses: MonsterSenseValues[];
  passivePerception: NumValue;
  languages: string;
  legendaryActions: NumValue;
  legendaryActionsLair: NumValue;
  spellcasting: {
    // null, а не '': пустое значение Select — null, иначе у поля виден крестик очистки.
    ability: AbilityScore | null;
    saveDc: NumValue;
    attackBonus: NumValue;
  };
  description: string;
  isPublic: boolean;
}

const optional = (value: number | null): NumValue => value ?? '';
const toOptional = (value: NumValue) => (value === '' ? null : Number(value));

export function toMonsterFormValues(
  monster: Monster | null,
): MonsterFormValues {
  const block = monster?.statBlock ?? DEFAULT_MONSTER_STAT_BLOCK;
  const { hitPoints, speed, spellcasting } = block;
  return {
    name: monster?.name ?? '',
    category: monster?.category ?? 'humanoid',
    role: monster?.role ?? 'regular',
    size: block.size,
    tags: block.tags,
    alignment: block.alignment,
    challenge: block.challenge,
    lairXp: optional(block.lairXp),
    armorClass: block.armorClass,
    initiative: block.initiative,
    hitPoints: {
      average: hitPoints.average,
      count: hitPoints.dice.count,
      die: String(hitPoints.dice.die),
      bonus: hitPoints.dice.bonus,
    },
    speed: {
      walk: speed.walk,
      burrow: optional(speed.burrow),
      climb: optional(speed.climb),
      fly: optional(speed.fly),
      swim: optional(speed.swim),
      hover: speed.hover,
    },
    abilities: structuredClone(block.abilities),
    skills: block.skills.map((entry) => ({
      id: crypto.randomUUID(),
      ...entry,
    })),
    vulnerabilities: [...block.vulnerabilities],
    resistances: [...block.resistances],
    immunities: [...block.immunities],
    conditionImmunities: [...block.conditionImmunities],
    senses: block.senses.map((entry) => ({
      id: crypto.randomUUID(),
      sense: entry.sense,
      range: optional(entry.range),
    })),
    passivePerception: block.passivePerception,
    languages: block.languages,
    legendaryActions: optional(block.legendaryActions),
    legendaryActionsLair: optional(block.legendaryActionsLair),
    spellcasting: {
      ability: spellcasting.ability,
      saveDc: optional(spellcasting.saveDc),
      attackBonus: optional(spellcasting.attackBonus),
    },
    description: monster?.description ?? '',
    isPublic: monster?.isPublic ?? false,
  };
}

// Тело запроса. Значения уже прошли проверку формы (monsterFormValidate), поэтому
// строки чисел здесь не пустые там, где поле обязательно.
export function toMonsterInput(
  values: MonsterFormValues,
  sources: readonly string[],
): MonsterInput {
  const { hitPoints, speed, spellcasting } = values;
  const fly = toOptional(speed.fly);
  return {
    name: values.name.trim(),
    description: values.description,
    sources: toSourcesInput(sources),
    isPublic: values.isPublic,
    category: values.category,
    role: values.role,
    statBlock: {
      size: values.size,
      tags: values.tags.trim(),
      alignment: values.alignment.trim(),
      armorClass: Number(values.armorClass),
      initiative: Number(values.initiative),
      hitPoints: {
        average: Number(hitPoints.average),
        dice: {
          count: Number(hitPoints.count),
          die: Number(hitPoints.die),
          bonus: Number(hitPoints.bonus),
        },
      },
      speed: {
        walk: Number(speed.walk),
        burrow: toOptional(speed.burrow),
        climb: toOptional(speed.climb),
        fly,
        swim: toOptional(speed.swim),
        // Без полёта «парит» не бывает: галочка остаётся от стёртого полёта.
        hover: speed.hover && fly !== null,
      },
      abilities: Object.fromEntries(
        ABILITY_SCORES.map((ability) => {
          const { score, save } = values.abilities[ability];
          return [ability, { score: Number(score), save: Number(save) }];
        }),
      ) as MonsterInput['statBlock']['abilities'],
      skills: values.skills.map(({ skill, bonus }) => ({
        skill: skill as Skill,
        bonus: Number(bonus),
      })),
      vulnerabilities: values.vulnerabilities,
      resistances: values.resistances,
      immunities: values.immunities,
      conditionImmunities: values.conditionImmunities,
      senses: values.senses.map(({ sense, range }) => ({
        sense: sense as SenseKind,
        // У «Видения невидимого» дистанции нет: поле заблокировано, значение не уходит.
        range: senseHasRange(sense as SenseKind) ? toOptional(range) : null,
      })),
      passivePerception: Number(values.passivePerception),
      languages: values.languages.trim(),
      challenge: values.challenge,
      lairXp: toOptional(values.lairXp),
      legendaryActions: toOptional(values.legendaryActions),
      // Число в логове без легендарных действий проверка формы не пропускает.
      legendaryActionsLair: toOptional(values.legendaryActionsLair),
      spellcasting: {
        ability: spellcasting.ability,
        saveDc: toOptional(spellcasting.saveDc),
        attackBonus: toOptional(spellcasting.attackBonus),
      },
    },
  };
}
