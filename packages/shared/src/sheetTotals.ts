import type { AbilityLink } from './abilityLinks.js';
import { traitEffects } from './abilityPassive.js';
import type { Character, CharacterProficiencies } from './character.js';
import type { CharacterEffectEntry, EffectLink } from './characterEffects.js';
import { expandConditions } from './conditionsExpand.js';
import { DAMAGE_TYPE_LABELS } from './damageTypes.js';
import { advantageKey, formatAdvantage } from './effectAdvantage.js';
import { formatArmorClass } from './effectArmorClass.js';
import {
  totalArmorClass,
  type ArmorClassBase,
} from './effectArmorClassTotal.js';
import { autoFailKey, formatAutoFail } from './effectAutoFail.js';
import type { EffectComponent } from './effectComponents.js';
import { CONDITION_LABELS } from './effectConditions.js';
import type { DefenseLevel } from './effectDefenses.js';
import { formatPerTurn } from './effectPerTurn.js';
import { formatRollBonus, rollBonusKey } from './effectRollBonus.js';
import { formatSense, type SenseKind } from './effectSenses.js';
import { formatSpeed } from './effectSpeed.js';
import {
  totalSpeed,
  type AppliedEffect,
  type SpeedBase,
  type SpeedTotal,
} from './effectSpeedTotal.js';
import { wornGear } from './gear.js';
import {
  ARMOR_SPEED_PENALTY,
  armorSpeedPenalty,
  gearArmorClass,
  type GearArmorClass,
} from './gearArmorClass.js';
import { perceptionShift } from './passivePerception.js';
import { conditionOf, sheetConditions } from './sheetConditions.js';

// Итог листа персонажа или карточки монстра: база из формы плюс черты и наложенные эффекты
// (docs/plan/done/character-effects.md, docs/plan/done/monsters-npcs.md, docs/plan/done/traits.md). Числа пересчитываются там, где движок это умеет
// (Скорость и Класс доспеха), остальное собирается в списки. У каждой строки — откуда она: названия
// эффектов или состояний, для подсказки на листе.

export type TotalLine = { text: string; from: string[] };

type EffectLinkEntry = { id: string } & EffectLink;
type AbilityLinkEntry = { id: string } & AbilityLink;

export type SheetTotals = {
  speed: SpeedTotal;
  // Что меняет Скорость и особые скорости: «Ускорение: Скорость вдвое больше».
  speedChanges: TotalLine[];
  armorClass: number;
  // Что меняет КД: «Щит веры: КД +2».
  armorClassChanges: TotalLine[];
  conditions: ReturnType<typeof sheetConditions>;
  defenses: (TotalLine & { level: DefenseLevel })[];
  senses: TotalLine[];
  rolls: TotalLine[];
  noHealing: string[];
  perTurn: TotalLine[];
  // Сдвиг пассивного восприятия от эффектов (passivePerception.ts).
  perception: ReturnType<typeof perceptionShift>;
};

// На персонажа действует эффект, который видит его владелец: скрытый или удалённый
// автором — нет (как предмет в инвентаре).
export function activeEffects(
  entries: readonly EffectLinkEntry[],
): AppliedEffect[] {
  return entries.flatMap((entry) =>
    entry.effect && !entry.inactive
      ? [{ source: entry.effect.id, components: entry.effect.components }]
      : [],
  );
}

// Строки с одинаковым текстом сливаются, источники — без повторов, в порядке появления.
function collect() {
  const lines = new Map<string, TotalLine>();
  return {
    add(key: string, text: string, from: string) {
      const line = lines.get(key) ?? { text, from: [] };
      if (!line.from.includes(from)) line.from.push(from);
      lines.set(key, line);
    },
    list: () => [...lines.values()],
  };
}

// Существо без эффектов — то, что итог пересчитывает. У монстра есть и особые скорости,
// у персонажа в форме — только обычная.
export type CreatureBase = { speed: SpeedBase } & ArmorClassBase;

// Итог листа персонажа: ещё и числа от надетого (docs/plan/equipment.md, этап 3).
export type CharacterTotals = SheetTotals & { gear: CharacterGearNumbers };

export interface CharacterGearNumbers {
  armorClass: GearArmorClass;
  // Доспех снижает Скорость: Силы меньше требования.
  speedPenalty: ReturnType<typeof armorSpeedPenalty>;
  // Доспех с помехой к Скрытности — его название.
  stealthDisadvantage: string | null;
}

export function characterGearNumbers(
  character: Pick<Character, 'armorClass' | 'abilityScores' | 'inventory'> & {
    proficiencies: Pick<CharacterProficiencies, 'armor'>;
  },
): CharacterGearNumbers {
  const gear = wornGear(character.inventory);
  const { armor } = gear;
  return {
    armorClass: gearArmorClass(gear, {
      unarmored: character.armorClass,
      dexterity: character.abilityScores.dexterity,
      training: character.proficiencies.armor,
    }),
    speedPenalty: armorSpeedPenalty(gear, character.abilityScores.strength),
    stealthDisadvantage: armor?.details.stealthDisadvantage ? armor.name : null,
  };
}

// Черты считаются всегда: вид листа «Без эффектов» передаёт пустой список эффектов, но
// не убирает черты — они часть самого персонажа. Надетое — тоже: оно часть листа, а не
// эффект. Скорость от доспеха снижается до эффектов: Haste удваивает уже сниженную.
export function sheetTotals(
  character: Pick<
    Character,
    | 'speed'
    | 'armorClass'
    | 'abilityScores'
    | 'effects'
    | 'abilities'
    | 'inventory'
  > & { proficiencies: Pick<CharacterProficiencies, 'armor'> },
  entries: readonly CharacterEffectEntry[] = character.effects,
): CharacterTotals {
  const gear = characterGearNumbers(character);
  const penalty = gear.speedPenalty;
  const totals = creatureTotals(
    {
      speed: {
        speed: Math.max(
          0,
          character.speed - (penalty ? ARMOR_SPEED_PENALTY : 0),
        ),
      },
      armorClass: gear.armorClass.armorClass - gear.armorClass.shieldBonus,
      dexterity: character.abilityScores.dexterity,
      wearsArmor: gear.armorClass.wearsArmor,
      shield: gear.armorClass.shieldBonus,
    },
    entries,
    character.abilities,
  );
  if (penalty) {
    totals.speedChanges.unshift({
      text: armorSpeedPenaltyText(penalty.strength),
      from: [penalty.name],
    });
  }
  return { ...totals, gear };
}

export const armorSpeedPenaltyText = (strength: number) =>
  `Скорость −${ARMOR_SPEED_PENALTY} фт: Сила ниже ${strength}`;

export function creatureTotals(
  base: CreatureBase,
  entries: readonly EffectLinkEntry[],
  abilities: readonly AbilityLinkEntry[] = [],
): SheetTotals {
  const traits = traitEffects(abilities);
  const applied = [...traits, ...activeEffects(entries)];
  const names = new Map([
    ...traits.map(({ source, name }) => [source, name] as const),
    ...entries.flatMap((e) =>
      e.effect ? [[e.effect.id, e.effect.name] as const] : [],
    ),
  ]);
  const nameOf = (source: string) => {
    const kind = conditionOf(source);
    return kind ? CONDITION_LABELS[kind] : (names.get(source) ?? source);
  };

  const expanded = expandConditions(applied);

  const speedLines = collect();
  const armorClassLines = collect();
  const defenses = new Map<string, TotalLine & { level: DefenseLevel }>();
  const senses = new Map<SenseKind, { range: number | null; from: string[] }>();
  const rolls = collect();
  const perTurn = collect();
  const noHealing: string[] = [];

  const take = (c: EffectComponent, from: string) => {
    switch (c.kind) {
      case 'speed':
        return speedLines.add(formatSpeed(c), formatSpeed(c), from);
      case 'armor_class':
        return armorClassLines.add(
          formatArmorClass(c),
          formatArmorClass(c),
          from,
        );
      case 'defense':
        for (const item of [
          ...c.damageTypes.map((t) => DAMAGE_TYPE_LABELS[t]),
          ...c.conditions.map((k) => CONDITION_LABELS[k]),
        ]) {
          const key = `${c.level}:${item}`;
          const line = defenses.get(key) ?? {
            level: c.level,
            text: item,
            from: [],
          };
          if (!line.from.includes(from)) line.from.push(from);
          defenses.set(key, line);
        }
        return;
      case 'sense': {
        // Одно чувство из нескольких источников — наибольшая дальность.
        const seen = senses.get(c.sense) ?? { range: c.range, from: [] };
        if (c.range !== null && (seen.range ?? 0) < c.range) {
          seen.range = c.range;
        }
        if (!seen.from.includes(from)) seen.from.push(from);
        return void senses.set(c.sense, seen);
      }
      case 'advantage':
        return rolls.add(
          `a:${advantageKey(c)}:${c.mode}`,
          formatAdvantage(c),
          from,
        );
      case 'auto_fail':
        return rolls.add(`f:${autoFailKey(c)}`, formatAutoFail(c), from);
      case 'roll_bonus':
        // Бонусы разных эффектов складываются (Bless и Guidance к одной проверке — оба),
        // поэтому строки не сливаются: у каждого эффекта своя.
        return rolls.add(
          `b:${from}:${rollBonusKey(c)}`,
          formatRollBonus(c),
          from,
        );
      case 'no_healing':
        if (!noHealing.includes(from)) noHealing.push(from);
        return;
      case 'per_turn':
        return perTurn.add(formatPerTurn(c), formatPerTurn(c), from);
      case 'condition':
        return;
      default:
        return c satisfies never;
    }
  };
  for (const { source, components } of expanded) {
    for (const c of components) take(c, nameOf(source));
  }

  return {
    speed: totalSpeed(base.speed, applied),
    speedChanges: speedLines.list(),
    armorClass: totalArmorClass(base, applied),
    armorClassChanges: armorClassLines.list(),
    conditions: sheetConditions(applied, expanded, nameOf),
    defenses: [...defenses.values()],
    senses: [...senses].map(([sense, { range, from }]) => ({
      text: formatSense({ sense, range }),
      from,
    })),
    rolls: rolls.list(),
    noHealing,
    perTurn: perTurn.list(),
    perception: perceptionShift(expanded, nameOf),
  };
}
