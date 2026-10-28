// Кто помещается в полосу очерёдности (решение Михаила 2026-10-27, вариант А при многих
// участниках): первым — последний ходивший, за ним текущий и следующие по кругу; не
// бросившие — в конце. Остальные — в счётчике «+N». Где круг переходит в следующий
// раунд, полоса ставит черту с его номером (решение Михаила 2026-10-28, вариант А).

export interface StripSlots {
  ids: string[];
  // Ходил последним (бледнее); null — нет такого в полосе.
  acted: string | null;
  // Перед каким местом ids начинается новый раунд — первый в очереди; null — не в полосе.
  divider: number | null;
  more: number;
}

export function stripSlots(
  order: readonly string[],
  unrolled: readonly string[],
  turn: string | null,
  capacity: number,
  // Первый ход боя: до него никто не ходил — бледного «ходившего» нет.
  firstTurn = false,
): StripSlots {
  const total = order.length + unrolled.length;
  const fit = Math.max(1, Math.min(capacity, total));
  const index = turn === null ? -1 : order.indexOf(turn);
  let sequence: string[];
  let acted: string | null = null;
  if (index === -1) {
    sequence = [...order, ...unrolled];
  } else {
    const cycle = [...order.slice(index), ...order.slice(0, index)];
    // Последний ходивший — перед текущим, если есть место и он не текущий.
    const previous =
      order.length > 1 && fit > 1 && !firstTurn
        ? order[(index - 1 + order.length) % order.length]
        : null;
    acted = previous;
    sequence = previous
      ? [previous, ...cycle.filter((id) => id !== previous), ...unrolled]
      : [...cycle, ...unrolled];
  }
  const ids = sequence.slice(0, fit);
  // Черта — перед первым в очереди, если он не в начале полосы (тогда раунд и так виден в
  // клетке раунда). Пока ход не начался, раундов ещё нет.
  const first = ids.indexOf(order[0]);
  return {
    ids,
    acted: acted && ids.includes(acted) ? acted : null,
    divider: index !== -1 && first > 0 ? first : null,
    more: total - ids.length,
  };
}

// Ширины в пикселях — как в TurnStrip.module.css: клетка портрета с зазором, «+N», клетка
// раунда с отступами полосы.
const CELL = 52;
const MORE = 46;
const FIXED = 70;
// Черта нового раунда между портретами.
export const DIVIDER = 22;

// Сколько портретов влезает в полосу ширины width; reserved — кнопки мастера справа.
export function stripCapacity(
  width: number,
  total: number,
  reserved: number,
): number {
  const room = width - FIXED - reserved;
  const all = Math.floor(room / CELL);
  if (all >= total) return total;
  return Math.max(1, Math.floor((room - MORE) / CELL));
}

// Место «Хода противника» в полосе игрока: безымянный участник, пока ходит скрытое от него
// существо (решение Михаила 2026-10-27, вариант А).
export const HIDDEN_TURN = 'hidden-turn';

export function withHiddenTurn(
  order: readonly string[],
  hidden: { after: string | null } | null,
): string[] {
  if (!hidden) return [...order];
  const at = hidden.after === null ? 0 : order.indexOf(hidden.after) + 1;
  return [...order.slice(0, at), HIDDEN_TURN, ...order.slice(at)];
}
