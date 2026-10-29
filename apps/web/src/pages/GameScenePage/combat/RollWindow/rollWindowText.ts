import type { RollMode, RollReasons, RollTerm, RollTermInput } from 'shared';

// Подписи окна броска (docs/plan/combat.md, «Окно броска»).

export const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

export const MODE_LABELS: Record<RollMode, string> = {
  normal: 'Обычный бросок',
  advantage: 'Преимущество',
  disadvantage: 'Помеха',
};

// Слагаемое строкой справа: число со знаком, у костей — «+1к4» до броска и «+3 (1к4)» после.
export function termAmount(term: RollTerm | RollTermInput): string {
  if (term.kind === 'number') return signed(term.amount);
  const dice = `${term.count}к${term.die}`;
  if (!('rolls' in term)) return `${term.sign < 0 ? '−' : '+'}${dice}`;
  return `${signed(term.amount)} (${dice}: ${term.rolls.join(', ')})`;
}

// Переключатель мастера: по правилам или как он решил.
export const MASTER_MODES = [
  { value: 'rules', label: 'По правилам' },
  { value: 'advantage', label: 'Преимущество' },
  { value: 'normal', label: 'Обычный' },
  { value: 'disadvantage', label: 'Помеха' },
];

// Причины по правилам одной строкой: «Преимущество: Благословение · Помеха: Врасплох».
export function reasonsText(reasons: RollReasons): string | null {
  const parts = [
    reasons.advantage.length
      ? `Преимущество: ${reasons.advantage.join(', ')}`
      : null,
    reasons.disadvantage.length
      ? `Помеха: ${reasons.disadvantage.join(', ')}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
