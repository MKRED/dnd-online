import type { AbilityActivation } from './abilityUsage.js';
import type { CombatantResources } from './game-combat.js';

// Способность в бою (docs/plan/combat.md, этап 4, решение Михаила 2026-10-27, вариант Б):
// «Применить» тратит её цену — действие нужного вида и ячейку, — а что она делает, мастер
// отмечает руками. Заряды, движение и кость хитов пока не тратятся.

export type TurnSpend = 'action' | 'bonus_action' | 'reaction' | 'free';

// Что тратит применение; null — в бою так не применить: черта действует сама, долгое
// применение занимает минуты, легендарные действия — позже. «Вместо одной атаки» — действие:
// атака пока одна на действие.
export function turnSpendOf(activation: AbilityActivation): TurnSpend | null {
  switch (activation.kind) {
    case 'action':
    case 'attack':
      return 'action';
    case 'bonus_action':
      return 'bonus_action';
    case 'reaction':
      return 'reaction';
    case 'free':
      return 'free';
    default:
      return null;
  }
}

// Почему сейчас нельзя; null — можно. Действие и бонусное — только в свой ход, реакция и
// «без действия» — когда угодно в бою.
export function spendBlock(
  spend: TurnSpend,
  resources: CombatantResources,
  ownTurn: boolean,
): string | null {
  if (spend === 'free') return null;
  if (spend === 'reaction') {
    return resources.reactions.used < resources.reactions.max
      ? null
      : 'Реакция уже потрачена';
  }
  if (!ownTurn) return 'Сейчас не ваш ход';
  if (spend === 'action') {
    return resources.actions.used < resources.actions.max
      ? null
      : 'В этом ходу действий больше нет';
  }
  return resources.bonusActions.used < resources.bonusActions.max
    ? null
    : 'Бонусное действие уже потрачено';
}
