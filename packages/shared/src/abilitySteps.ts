import { ABILITY_SCORES, type AbilityScore } from './character.js';
import type { DamageDie, DamageType } from './damageTypes.js';

// «Применение» способности — список шагов (docs/plan/abilities.md, docs/dnd/attacks-and-saves.md).
// Этап 3: один шаг, проверка — бросок атаки, последствия — урон при попадании и при
// промахе. Спасбросок, области и несколько шагов добавят этапы 4 и 5. Ключи хранятся в
// базе: добавлять можно, переименовывать — только с миграцией данных.

export const ATTACK_KINDS = [
  'melee_weapon',
  'ranged_weapon',
  'melee_spell',
  'ranged_spell',
] as const;
export type AttackKind = (typeof ATTACK_KINDS)[number];

export const isMeleeAttack = (attack: AttackKind) =>
  attack === 'melee_weapon' || attack === 'melee_spell';

// Чей модификатор: одна из шести, «Сила или Ловкость» (фехтовальное оружие — игра возьмёт
// больший) или заклинательная характеристика владельца (её задаёт класс, на листе её
// пока нет).
export const ATTACK_ABILITIES = [
  ...ABILITY_SCORES,
  'finesse',
  'spellcasting',
] as const;
export type AttackAbility = (typeof ATTACK_ABILITIES)[number];

// Модификатор + бонус мастерства, как в книге, или готовое число (монстр, предмет).
// Владение оружием считаем всегда есть.
export type AttackBonus =
  | { kind: 'ability'; ability: AttackAbility }
  | { kind: 'fixed'; value: number };
export const ATTACK_BONUS_MIN = -5;
export const ATTACK_BONUS_MAX = 30;

// Касание и досягаемость — у ближних атак, дистанция — у дальнобойных. Дальняя
// дистанция (с помехой) — только у оружия: «Длинный лук» 150/600.
export type StepTarget =
  | { kind: 'touch' }
  | { kind: 'reach'; feet: number }
  | { kind: 'range'; feet: number; longFeet: number | null };
export const STEP_TARGET_KINDS = [
  'touch',
  'reach',
  'range',
] as const satisfies readonly StepTarget['kind'][];
export type StepTargetKind = (typeof STEP_TARGET_KINDS)[number];

export const FEET_STEP = 5;
export const REACH_FEET_MAX = 30;
// Миля — самая большая дистанция заклинаний в футах; «без ограничений» не нужна атакам.
export const RANGE_FEET_MAX = 5280;

export interface DamagePart {
  count: number;
  die: DamageDie;
  number: number;
  type: DamageType;
}
export const DAMAGE_DICE_MAX = 40;
export const DAMAGE_NUMBER_MAX = 100;
export const DAMAGE_PARTS_MAX = 5;

export const MISS_OUTCOMES = ['none', 'half'] as const;
export type MissOutcome = (typeof MISS_OUTCOMES)[number];

export interface AttackCheck {
  kind: 'attack';
  attack: AttackKind;
  bonus: AttackBonus;
}

// Урон без строк бывает: «Сеть» только опутывает (эффекты в последствиях — этап 7).
// addModifier — модификатор той же характеристики, что у атаки, один раз на весь урон:
// у оружия да, у заклинаний обычно нет. При числовом бонусе его нет: число урона —
// в строках.
export interface AbilityStep {
  target: StepTarget;
  check: AttackCheck;
  damage: DamagePart[];
  addModifier: boolean;
  onMiss: MissOutcome;
}

// Этап 5 поднимет предел.
export const ABILITY_STEPS_MAX = 1;

// Значение по умолчанию для вида атаки: цель, характеристика и модификатор к урону.
export const ATTACK_DEFAULTS: Record<
  AttackKind,
  { target: StepTargetKind; ability: AttackAbility; addModifier: boolean }
> = {
  melee_weapon: { target: 'reach', ability: 'strength', addModifier: true },
  ranged_weapon: { target: 'range', ability: 'dexterity', addModifier: true },
  melee_spell: { target: 'touch', ability: 'spellcasting', addModifier: false },
  ranged_spell: {
    target: 'range',
    ability: 'spellcasting',
    addModifier: false,
  },
};

// Какие цели подходят виду атаки.
export const attackTargets = (attack: AttackKind): StepTargetKind[] =>
  isMeleeAttack(attack) ? ['touch', 'reach'] : ['range'];
