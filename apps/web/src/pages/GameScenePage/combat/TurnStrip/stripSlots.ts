// Кто помещается в полосу очерёдности (решение Михаила 2026-10-27, вариант А при многих
// участниках): первым — последний ходивший, за ним текущий и следующие по кругу; не
// бросившие — в конце. Остальные — в счётчике «+N».

export interface StripSlots {
  ids: string[];
  // Ходил последним (бледнее); null — нет такого в полосе.
  acted: string | null;
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
  return {
    ids,
    acted: acted && ids.includes(acted) ? acted : null,
    more: total - ids.length,
  };
}

// Ширины в пикселях — как в TurnStrip.module.css: клетка портрета с зазором, «+N», клетка
// раунда с отступами полосы.
const CELL = 52;
const MORE = 46;
const FIXED = 70;

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
