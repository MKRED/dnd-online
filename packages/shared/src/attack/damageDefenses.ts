import type { DamageType } from '../damageTypes.js';
import type { DefenseLevel } from '../effectDefenses.js';
import type { AppliedEffect } from '../effectSpeedTotal.js';
import { effectsBySource } from './fighterConditions.js';

// Сопротивление, уязвимость и иммунитет цели к типам урона: из стат-блока монстра и из
// эффектов и состояний (Окаменевший — сопротивление ко всему). Правила — Rules Glossary
// 2024 (docs/dnd/modifiers.md): иммунитет — урона нет, сопротивление — половина с
// округлением вниз и только раз, уязвимость — вдвое.
export type DamageDefenses = Partial<Record<DamageType, DefenseLevel[]>>;

export interface StatBlockDefenses {
  resistances: readonly DamageType[];
  vulnerabilities: readonly DamageType[];
  immunities: readonly DamageType[];
}

export function damageDefenses(
  effects: readonly AppliedEffect[],
  statBlock?: StatBlockDefenses,
): DamageDefenses {
  const result: DamageDefenses = {};
  const add = (type: DamageType, level: DefenseLevel) => {
    const list = result[type] ?? [];
    if (!list.includes(level)) list.push(level);
    result[type] = list;
  };
  if (statBlock) {
    statBlock.resistances.forEach((t) => add(t, 'resistance'));
    statBlock.vulnerabilities.forEach((t) => add(t, 'vulnerability'));
    statBlock.immunities.forEach((t) => add(t, 'immunity'));
  }
  for (const { components } of effectsBySource(effects)) {
    for (const c of components) {
      if (c.kind === 'defense') c.damageTypes.forEach((t) => add(t, c.level));
    }
  }
  return result;
}

// Урон одного типа после защит. Порядок — сначала сопротивление, потом уязвимость
// (Playing the Game 2024, «Damage Resistance and Vulnerability»; прочитан только в пересказе,
// docs/dnd/combat.md). Сопротивление и уязвимость вместе: половина, потом вдвое.
export function defendedAmount(
  amount: number,
  levels: readonly DefenseLevel[] = [],
): number {
  if (levels.includes('immunity')) return 0;
  let result = amount;
  if (levels.includes('resistance')) result = Math.floor(result / 2);
  if (levels.includes('vulnerability')) result *= 2;
  return result;
}
