import { rollDie } from '../d20Roll.js';
import type { DamageType } from '../damageTypes.js';
import type { DefenseLevel } from '../effectDefenses.js';
import type { DamageTerm, DamageTermInput } from './attackTerms.js';
import { defendedAmount, type DamageDefenses } from './damageDefenses.js';
import { effectsBySource, type FighterEffects } from './fighterConditions.js';

// Урон атаки (docs/dnd/combat.md; docs/plan/combat.md, «Решения к этапу 5»): кости и
// модификаторы оружия, прибавки к урону из эффектов атакующего (Divine Favor, Enlarge), на
// крите кости вдвое, потом защиты цели по типам.

// Прибавки «к своему урону» из эффектов: тип — свой у прибавки (Излучение у Divine Favor)
// или тот же, что у атаки (weaponType).
export function effectDamageTerms(
  attacker: FighterEffects,
  weaponType: DamageType,
): DamageTermInput[] {
  const terms: DamageTermInput[] = [];
  for (const { source, components } of effectsBySource(attacker.effects)) {
    const label = attacker.nameOf(source);
    for (const c of components) {
      if (c.kind !== 'roll_bonus' || c.roll !== 'damage') continue;
      const type = c.damageType ?? weaponType;
      const sign = c.mode === 'bonus' ? 1 : -1;
      if (c.count > 0) {
        terms.push({
          kind: 'dice',
          label,
          count: c.count,
          die: c.die,
          sign,
          type,
        });
      }
      if (c.number > 0) {
        terms.push({ kind: 'number', label, amount: sign * c.number, type });
      }
    }
  }
  return terms;
}

export interface DamageByType {
  type: DamageType;
  // Сколько выпало этого типа и сколько прошло после защит цели.
  rolled: number;
  dealt: number;
  defenses: DefenseLevel[];
}

export interface DamageRoll {
  critical: boolean;
  terms: DamageTerm[];
  byType: DamageByType[];
  total: number;
}

// Крит: «Roll all of the attack's damage dice twice and add them together» (Rules Glossary
// 2024, Critical Hit) — вдвое и кости прибавок из эффектов: они тоже кости урона атаки.
// Кость вычета (Ray of Enfeeblement) не удваивается: это не урон атаки (решение приложения).
export function rollDamage(
  input: readonly DamageTermInput[],
  critical: boolean,
  defenses: DamageDefenses,
  random: () => number = Math.random,
): DamageRoll {
  const terms = input.map((term): DamageTerm => {
    if (term.kind === 'number') return term;
    const count = critical && term.sign > 0 ? term.count * 2 : term.count;
    const rolls = Array.from({ length: count }, () =>
      rollDie(term.die, random),
    );
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { ...term, count, rolls, amount: term.sign * sum };
  });
  const sums = new Map<DamageType, number>();
  for (const term of terms) {
    sums.set(term.type, (sums.get(term.type) ?? 0) + term.amount);
  }
  // Отрицательного урона не бывает: вычеты съедают тип не ниже нуля.
  const byType = [...sums].map(([type, sum]): DamageByType => {
    const rolled = Math.max(0, sum);
    const levels = defenses[type] ?? [];
    return {
      type,
      rolled,
      dealt: defendedAmount(rolled, levels),
      defenses: [...levels],
    };
  });
  return {
    critical,
    terms,
    byType,
    total: byType.reduce((sum, part) => sum + part.dealt, 0),
  };
}
