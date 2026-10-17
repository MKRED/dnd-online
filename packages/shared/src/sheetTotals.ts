import type { Character } from './character.js';
import type { CharacterEffectEntry } from './characterEffects.js';
import { expandConditions } from './conditionsExpand.js';
import { DAMAGE_TYPE_LABELS } from './damageTypes.js';
import { advantageKey, formatAdvantage } from './effectAdvantage.js';
import { formatArmorClass } from './effectArmorClass.js';
import { totalArmorClass } from './effectArmorClassTotal.js';
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
  type SpeedTotal,
} from './effectSpeedTotal.js';
import { conditionOf, sheetConditions } from './sheetConditions.js';

// Итог листа персонажа: база из формы плюс наложенные эффекты
// (docs/plan/character-effects.md). Числа пересчитываются там, где движок это умеет
// (Скорость и Класс доспеха), остальное собирается в списки. У каждой строки — откуда она: названия
// эффектов или состояний, для подсказки на листе.

export type TotalLine = { text: string; from: string[] };

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
};

// На персонажа действует эффект, который видит его владелец: скрытый или удалённый
// автором — нет (как предмет в инвентаре).
export function activeEffects(
  entries: readonly CharacterEffectEntry[],
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

export function sheetTotals(
  character: Pick<
    Character,
    'speed' | 'armorClass' | 'abilityScores' | 'effects'
  >,
  entries: readonly CharacterEffectEntry[] = character.effects,
): SheetTotals {
  const applied = activeEffects(entries);
  const names = new Map(
    entries.flatMap((e) => (e.effect ? [[e.effect.id, e.effect.name]] : [])),
  );
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
    speed: totalSpeed({ speed: character.speed }, applied),
    speedChanges: speedLines.list(),
    armorClass: totalArmorClass(
      {
        armorClass: character.armorClass,
        dexterity: character.abilityScores.dexterity,
      },
      applied,
    ),
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
  };
}
