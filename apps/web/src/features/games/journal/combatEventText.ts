import type {
  CombatAction,
  D20Roll,
  GameEvent,
  RollTerm,
  TurnSpend,
} from 'shared';

type CombatEvent = Extract<
  GameEvent,
  {
    kind:
      | 'combat.started'
      | 'combat.joined'
      | 'combat.left'
      | 'combat.initiative'
      | 'combat.initiative_set'
      | 'combat.order'
      | 'combat.turn'
      | 'combat.action'
      | 'combat.ability'
      | 'combat.resources';
  }
>;

// Строка журнала о бое с очерёдностью (docs/plan/combat.md, этап 2).
export function combatEventText(event: CombatEvent): string {
  switch (event.kind) {
    case 'combat.started':
      return `Бой с очерёдностью: участников ${event.result.count}, бросают инициативу`;
    case 'combat.joined':
      return `В бой: ${event.result.combatant.name}`;
    case 'combat.left': {
      const { combatant, turnPassed } = event.result;
      return turnPassed
        ? `Из боя: ${combatant.name}, ход перешёл дальше`
        : `Из боя: ${combatant.name}`;
    }
    case 'combat.initiative': {
      const { combatant, roll } = event.result;
      return `Инициатива: ${combatant.name} — ${roll.total} (${rollText(roll)})`;
    }
    case 'combat.initiative_set': {
      const { combatant, before } = event.result;
      return `Инициатива поправлена: ${combatant.name} — ${before ?? 'не брошена'} → ${event.intent.initiative}`;
    }
    case 'combat.order':
      return 'Очередь хода переставлена';
    case 'combat.turn': {
      const { combatant, round, newRound } = event.result;
      return newRound
        ? `Раунд ${round} · ходит ${combatant.name}`
        : `Ходит ${combatant.name}`;
    }
    case 'combat.action': {
      const { combatant, action } = event.result;
      return `${combatant.name}: ${ACTION_NAMES[action]}`;
    }
    case 'combat.ability': {
      const { combatant, ability, slotLevel } = event.result;
      const slot = slotLevel === null ? '' : `, ячейка ${slotLevel} круга`;
      return `${combatant.name}: ${ability.name} (${SPEND_NAMES[event.result.spent]}${slot})`;
    }
    case 'combat.resources': {
      const { combatant, after } = event.result;
      return `Потрачено поправлено: ${combatant.name} — действий ${after.actionsUsed}, бонусных ${after.bonusActionsUsed}, реакций ${after.reactionsUsed}`;
    }
  }
}

// Что потратило применение способности (этап 4, вариант Б).
const SPEND_NAMES: Record<TurnSpend, string> = {
  action: 'действие',
  bonus_action: 'бонусное действие',
  reaction: 'реакция',
  free: 'без действия',
};

// Обычные действия хода (этап 4) — как в блоке «Ваш ход».
export const ACTION_NAMES: Record<CombatAction, string> = {
  dash: 'Рывок',
  disengage: 'Отход',
  dodge: 'Уклонение',
};

const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

function termText(term: RollTerm): string {
  if (term.kind === 'number') return `${term.label} ${signed(term.amount)}`;
  const sign = term.sign < 0 ? '−' : '+';
  return `${term.label} ${sign}${term.count}к${term.die} (${term.rolls.join(', ')})`;
}

// «к20: 15 (и 7), преимущество; Ловкость +3» — засчитанная кость, вторая в скобках, и слагаемые.
export function rollText(roll: D20Roll): string {
  const kept = roll.dice[roll.kept];
  const other = roll.dice.filter((_, i) => i !== roll.kept);
  const mode =
    roll.mode === 'advantage'
      ? ', преимущество'
      : roll.mode === 'disadvantage'
        ? ', помеха'
        : '';
  const dice = other.length > 0 ? `${kept} (и ${other[0]})` : `${kept}`;
  const terms = roll.terms.map(termText);
  return [`к20: ${dice}${mode}`, ...terms].join('; ');
}
