import type { AreaOrigin, AreaSpec } from './abilityStepAreas.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';
import type { StepEffect } from './abilityStepEffects.js';
import type { DamageDie, DamageType } from './damageTypes.js';

// «Применение» способности — список шагов (docs/plan/abilities.md, docs/dnd/attacks-and-saves.md).
// Шаг: когда он срабатывает, цель, проверка (бросок атаки, спасбросок или никакой),
// сколько раз и последствия. Как шаги связаны в цепочку — abilityStepLinks.ts. Ключи хранятся в базе: добавлять можно, переименовывать — только
// с миграцией данных.

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

// Сл спасброска: 8 + модификатор + бонус мастерства, как Сл заклинаний и оружия
// дыхания (Телосложение), или готовое число.
export const SAVE_DC_ABILITIES = [...ABILITY_SCORES, 'spellcasting'] as const;
export type SaveDcAbility = (typeof SAVE_DC_ABILITIES)[number];
export type SaveDc =
  | { kind: 'ability'; ability: SaveDcAbility }
  | { kind: 'fixed'; value: number };
export const SAVE_DC_MIN = 1;
export const SAVE_DC_MAX = 30;

// Цель: на себя, касание, досягаемость, дистанция или область. Какие подходят — решают
// проверка и прошлый шаг (stepTargets). Дальняя дистанция (с помехой) — только у
// оружия: «Длинный лук» 150/600. У шага 2 и дальше есть ещё цели прошлого шага: «Та же
// цель» и «Она и все вокруг неё» на feet футов («Ледяной кинжал»: цель и все в 5 фт.).
export type StepTarget =
  | { kind: 'previous' }
  | { kind: 'around'; feet: number }
  | { kind: 'self' }
  | { kind: 'touch' }
  | { kind: 'reach'; feet: number }
  | { kind: 'range'; feet: number; longFeet: number | null }
  | { kind: 'area'; area: AreaSpec; origin: AreaOrigin };
export const STEP_TARGET_KINDS = [
  'previous',
  'around',
  'self',
  'touch',
  'reach',
  'range',
  'area',
] as const satisfies readonly StepTarget['kind'][];
export type StepTargetKind = (typeof STEP_TARGET_KINDS)[number];

export const FEET_STEP = 5;
export const REACH_FEET_MAX = 30;
// «Цепная молния» — 30 фт. от первой цели, с запасом.
export const AROUND_FEET_MAX = 60;
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

// Урон при промахе: ничего или половина урона попадания («Кислотная стрела»).
export const MISS_DAMAGES = ['none', 'half'] as const;
export type MissDamage = (typeof MISS_DAMAGES)[number];

export interface AttackCheck {
  kind: 'attack';
  attack: AttackKind;
  bonus: AttackBonus;
}
// Без проверки урон проходит сам, как у «Волшебной стрелы».
export type AbilityCheck =
  | AttackCheck
  | { kind: 'save'; ability: AbilityScore; dc: SaveDc }
  | { kind: 'none' };
export type AbilityCheckKind = AbilityCheck['kind'];
export const ABILITY_CHECK_KINDS = [
  'attack',
  'save',
  'none',
] as const satisfies readonly AbilityCheckKind[];

// Последствия — два исхода отдельными объектами, чтобы расти без переименований.
// hit — проверка сработала против цели: попадание атакой, провал спасброска, а без
// проверки — всегда; miss — промах или успех спасброска, без проверки его нет (ничего). Эффекты в последствиях (этап 8) лягут
// в оба: у «Ошеломляющего удара» свой эффект и при успехе.
//
// Урон без строк бывает: «Сеть» только опутывает. addModifier — модификатор той же
// характеристики, что у атаки, один раз на весь урон: у оружия да, у заклинаний обычно
// нет. Только у атаки с бонусом от характеристики: иначе число урона — в строках.
//
// effects — эффекты из каталога (этап 8, abilityStepEffects.ts): у hit — на цель при
// попадании или провале, у miss — при промахе или успехе; без проверки miss пуст.
export interface HitOutcome {
  damage: DamagePart[];
  addModifier: boolean;
  effects: StepEffect[];
}
export interface MissOutcome {
  damage: MissDamage;
  effects: StepEffect[];
}

// Когда шаг срабатывает: всегда или по исходу прошлого шага (hit — попадание или
// провал, miss — промах или успех). У первого шага — всегда.
export const STEP_WHENS = ['always', 'hit', 'miss'] as const;
export type StepWhen = (typeof STEP_WHENS)[number];

// Сколько раз: «Палящий луч» — 3 луча, у каждого свой бросок; цели выбирают при
// применении, одну или разные. 9 круг «Волшебной стрелы» — 11 дротиков.
export const STEP_TIMES_MAX = 20;

// Рост шага (этап 7): строки урона и повторы, прибавляемые на каждую ступень — круг
// ячейки выше затраты или порог уровня персонажа. С чем растёт, решает способность
// (abilityStepGrowth.ts). Урон прибавляется к исходу hit, половина при miss — от суммы.
export interface StepGrowth {
  damage: DamagePart[];
  times: number;
}
// В книге за ступень всегда +1 повтор; сумма с times не сверяется с STEP_TIMES_MAX —
// число ступеней зависит от затрат, а не от шага.
export const GROWTH_TIMES_MAX = 3;

export interface AbilityStep {
  when: StepWhen;
  target: StepTarget;
  times: number;
  check: AbilityCheck;
  hit: HitOutcome;
  miss: MissOutcome;
  growth: StepGrowth;
}

// В книге больше двух шагов не нашлось («Ледяной кинжал»), три — с запасом.
export const ABILITY_STEPS_MAX = 3;

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
