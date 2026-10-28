import type { RollTerm, RollTermInput } from '../d20Roll.js';
import type { DamageType } from '../damageTypes.js';

// Слагаемое урона — то же, что у к20, но со своим типом урона: у доп. урона оружия и у
// прибавки эффекта он может отличаться от типа самого оружия.
export type DamageTermInput = RollTermInput & { type: DamageType };
export type DamageTerm = RollTerm & { type: DamageType };

export const numberTerm = (label: string, amount: number) =>
  ({ kind: 'number', label, amount }) as const;
