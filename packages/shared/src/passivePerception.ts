import type { Character } from './character.js';
import { getAbilityModifier } from './abilityModifier.js';
import type { EffectComponent } from './effectComponents.js';
import type { AppliedEffect } from './effectSpeedTotal.js';

// Пассивное восприятие (docs/dnd/combat-stats.md): по глоссарию 2024 — 10 плюс бонус
// проверки Мудрости (Восприятие); преимущество на такие проверки даёт +5, помеха −5.

// 10 + модификатор Мудрости + бонус мастерства (вдвое — с компетентностью), без эффектов.
export function passivePerceptionBase(
  character: Pick<
    Character,
    'abilityScores' | 'proficiencyBonus' | 'skillProficiencies'
  >,
): number {
  const skill = character.skillProficiencies.find(
    (s) => s.skill === 'perception',
  );
  const proficiency = skill
    ? character.proficiencyBonus * (skill.expertise ? 2 : 1)
    : 0;
  return 10 + getAbilityModifier(character.abilityScores.wisdom) + proficiency;
}

export type PerceptionLine = { text: string; amount: number; from: string[] };

// Сдвиг от эффектов: строки с тем, откуда они. Считается только то, что действует всегда
// (без условия «когда») и касается проверок Мудрости: проверки всех характеристик и все
// Тесты к20 — тоже. Кость (Guidance, 1к4) в пассивное число не входит — это не
// постоянный бонус; входит только число.
export function perceptionShift(
  expanded: readonly AppliedEffect[],
  nameOf: (source: string) => string,
): { shift: number; lines: PerceptionLine[] } {
  const advantage: string[] = [];
  const disadvantage: string[] = [];
  const bonuses: PerceptionLine[] = [];
  for (const { source, components } of expanded) {
    const from = nameOf(source);
    for (const c of components) {
      if (c.kind === 'advantage' && touchesPerception(c)) {
        const list = c.mode === 'advantage' ? advantage : disadvantage;
        if (!list.includes(from)) list.push(from);
      }
      if (c.kind === 'roll_bonus' && touchesPerception(c) && c.number > 0) {
        const amount = c.mode === 'bonus' ? c.number : -c.number;
        bonuses.push({ text: signed(amount), amount, from: [from] });
      }
    }
  }
  const lines: PerceptionLine[] = [];
  // Преимущество и помеха вместе гасят друг друга, как у броска.
  if (advantage.length > 0 && disadvantage.length === 0) {
    lines.push({ text: 'Преимущество: +5', amount: 5, from: advantage });
  }
  if (disadvantage.length > 0 && advantage.length === 0) {
    lines.push({ text: 'Помеха: −5', amount: -5, from: disadvantage });
  }
  lines.push(...bonuses);
  return { shift: lines.reduce((sum, l) => sum + l.amount, 0), lines };
}

type RollComponent = Extract<
  EffectComponent,
  { kind: 'advantage' } | { kind: 'roll_bonus' }
>;

function touchesPerception(c: RollComponent): boolean {
  if (c.kind === 'advantage' && c.when !== null) return false;
  if (c.roll === 'd20') return true;
  return c.roll === 'check' && (c.ability === null || c.ability === 'wisdom');
}

function signed(amount: number): string {
  return amount >= 0 ? `+${amount}` : `−${-amount}`;
}
