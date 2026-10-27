import type { AbilityLink } from './abilityLinks.js';
import { traitEffects } from './abilityPassive.js';
import type { EffectLink } from './characterEffects.js';
import { expandConditions } from './conditionsExpand.js';
import type { D20RollInput, RollTermInput } from './d20Roll.js';
import type { EffectComponent } from './effectComponents.js';
import { CONDITION_LABELS } from './effectConditions.js';
import type { AppliedEffect } from './effectSpeedTotal.js';
import { activeEffects } from './sheetTotals.js';
import { conditionOf } from './sheetConditions.js';

// Бросок инициативы (docs/dnd/combat.md): по книге 2024 это проверка Ловкости. Её
// касаются преимущество и помеха на инициативу, на проверки Ловкости или всех
// характеристик и на все Тесты к20; так же — бонус к броску. Условные («пока наложивший
// в поле зрения») не считаются: движок их пока не проверяет, как у пассивного восприятия.
// Врасплох — помеха (внезапность 2024).

export const SURPRISED_LABEL = 'Врасплох';

type RollComponent = Extract<
  EffectComponent,
  { kind: 'advantage' } | { kind: 'roll_bonus' }
>;

function touchesInitiative(c: RollComponent): boolean {
  if (c.kind === 'advantage' && c.when !== null) return false;
  if (c.roll === 'initiative' || c.roll === 'd20') return true;
  return (
    c.roll === 'check' && (c.ability === null || c.ability === 'dexterity')
  );
}

// base — модификатор инициативы с подписью: «Ловкость» у персонажа и НПС, «Инициатива»
// из стат-блока у монстра. nameOf — название эффекта или состояния по источнику.
export function initiativeRollInput(
  base: { label: string; modifier: number },
  effects: readonly AppliedEffect[],
  nameOf: (source: string) => string,
  surprised: boolean,
): Omit<D20RollInput, 'master'> {
  const advantage: string[] = [];
  const disadvantage: string[] = [];
  const terms: RollTermInput[] = [
    { kind: 'number', label: base.label, amount: base.modifier },
  ];
  // Одно заклинание дважды не складывается (docs/dnd/combining-effects.md): от источника
  // берётся последний экземпляр.
  const bySource = new Map<string, AppliedEffect>();
  for (const effect of expandConditions(effects)) {
    bySource.set(effect.source, effect);
  }
  for (const { source, components } of bySource.values()) {
    const from = nameOf(source);
    for (const c of components) {
      if (c.kind === 'advantage' && touchesInitiative(c)) {
        const list = c.mode === 'advantage' ? advantage : disadvantage;
        if (!list.includes(from)) list.push(from);
      }
      if (c.kind === 'roll_bonus' && touchesInitiative(c)) {
        const sign = c.mode === 'bonus' ? 1 : -1;
        if (c.count > 0) {
          terms.push({
            kind: 'dice',
            label: from,
            count: c.count,
            die: c.die,
            sign,
          });
        }
        if (c.number > 0) {
          terms.push({ kind: 'number', label: from, amount: sign * c.number });
        }
      }
    }
  }
  if (surprised) disadvantage.push(SURPRISED_LABEL);
  return { terms, reasons: { advantage, disadvantage } };
}

// То же по спискам листа: эффекты и черты, как их считает итог листа (sheetTotals.ts), с
// их названиями и названиями состояний.
export function initiativeFromSheet(
  base: { label: string; modifier: number },
  entries: readonly ({ id: string } & EffectLink)[],
  abilities: readonly ({ id: string } & AbilityLink)[],
  surprised: boolean,
): Omit<D20RollInput, 'master'> {
  const traits = traitEffects(abilities);
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
  return initiativeRollInput(
    base,
    [...traits, ...activeEffects(entries)],
    nameOf,
    surprised,
  );
}

// Место в очерёдности: выше итог, при равном — выше модификатор инициативы (решение
// с Михаилом 2026-10-27 вместо выбора мастера и игроков по книге), дальше — случай.
export interface InitiativeRank {
  initiative: number;
  modifier: number;
}

// Отрицательное — a ходит раньше b, 0 — ничья.
export const compareInitiative = (a: InitiativeRank, b: InitiativeRank) =>
  b.initiative - a.initiative || b.modifier - a.modifier;

// Куда встаёт newcomer в очередь order (она могла быть переставлена мастером): перед
// первым, кто ему уступает, а среди равных ему прямо перед этим местом — на случайное.
export function initiativeSlot(
  order: readonly InitiativeRank[],
  newcomer: InitiativeRank,
  random: () => number = Math.random,
): number {
  let slot = order.findIndex((r) => compareInitiative(newcomer, r) < 0);
  if (slot === -1) slot = order.length;
  let tied = 0;
  while (
    slot - tied > 0 &&
    compareInitiative(newcomer, order[slot - tied - 1]) === 0
  ) {
    tied += 1;
  }
  return slot - Math.floor(random() * (tied + 1));
}

// Чей ход следующий: за последним — снова первый, и это новый раунд.
export function nextTurn<T>(
  order: readonly T[],
  current: T | null,
): { next: T; wrapped: boolean } | null {
  if (order.length === 0) return null;
  const index = current === null ? -1 : order.indexOf(current);
  if (index === -1 || index === order.length - 1) {
    return { next: order[0], wrapped: index !== -1 };
  }
  return { next: order[index + 1], wrapped: false };
}
