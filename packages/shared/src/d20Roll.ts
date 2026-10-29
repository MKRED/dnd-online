import type { DamageDie } from './damageTypes.js';

// Бросок к20 со слагаемыми (docs/plan/combat.md, «Окно броска»): кость бросает сервер,
// окно броска и журнал показывают ту же структуру. Первой её получила инициатива, потом
// возьмут атаки, проверки и спасброски.

export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const;
export type RollMode = (typeof ROLL_MODES)[number];

// Слагаемое: число с источником («Ловкость», +3) или кости эффекта («Наставление», 1к4).
// sign у костей — прибавить или вычесть (Bane вычитает 1к4); amount — итог слагаемого.
export type RollTerm =
  | { kind: 'number'; label: string; amount: number }
  | {
      kind: 'dice';
      label: string;
      count: number;
      die: DamageDie;
      sign: 1 | -1;
      rolls: number[];
      amount: number;
    };

// Слагаемое до броска: у костей ещё нет выпавших чисел.
export type RollTermInput =
  | { kind: 'number'; label: string; amount: number }
  | {
      kind: 'dice';
      label: string;
      count: number;
      die: DamageDie;
      sign: 1 | -1;
    };

// Откуда преимущество и помеха по правилам: названия эффектов, состояний, «Врасплох».
export interface RollReasons {
  advantage: string[];
  disadvantage: string[];
}

export interface D20RollInput {
  terms: RollTermInput[];
  reasons: RollReasons;
  // Переключатель мастера: его выбор вместо правил; null — по правилам.
  master: RollMode | null;
}

export interface D20Roll extends Omit<D20RollInput, 'terms'> {
  // Кости к20: одна, а при преимуществе или помехе — две; kept — номер засчитанной.
  dice: number[];
  kept: number;
  mode: RollMode;
  terms: RollTerm[];
  total: number;
}

// Преимущество и помеха вместе гасят друг друга, сколько бы их ни было (глоссарий 2024,
// Advantage). Мастер решает за правила: «The DM determines … whether you have Advantage».
export function rollModeOf(
  reasons: RollReasons,
  master: RollMode | null,
): RollMode {
  if (master) return master;
  const advantage = reasons.advantage.length > 0;
  const disadvantage = reasons.disadvantage.length > 0;
  if (advantage === disadvantage) return 'normal';
  return advantage ? 'advantage' : 'disadvantage';
}

// random — число в [0, 1), как у Math.random; сервер даёт криптостойкое.
export const rollDie = (sides: number, random: () => number) =>
  1 + Math.floor(random() * sides);

export function rollD20(
  input: D20RollInput,
  random: () => number = Math.random,
): D20Roll {
  const mode = rollModeOf(input.reasons, input.master);
  const dice = [rollDie(20, random)];
  if (mode !== 'normal') dice.push(rollDie(20, random));
  const better = dice.length === 2 && dice[1] > dice[0] ? 1 : 0;
  const kept =
    dice.length === 1 ? 0 : mode === 'advantage' ? better : 1 - better;
  const terms = input.terms.map((term): RollTerm => {
    if (term.kind === 'number') return term;
    const rolls = Array.from({ length: term.count }, () =>
      rollDie(term.die, random),
    );
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { ...term, rolls, amount: term.sign * sum };
  });
  const total = terms.reduce((sum, term) => sum + term.amount, dice[kept]);
  return {
    dice,
    kept,
    mode,
    reasons: input.reasons,
    master: input.master,
    terms,
    total,
  };
}
