import type { Tile } from '../../../maps';

// История правок плитки для «Отменить» и «Вернуть». Снимок кладётся на каждый мазок
// (от нажатия до отпускания), а не на каждый пиксель — иначе отмена линии шла бы по
// одному пикселю.
export interface TileHistory {
  past: Tile[];
  present: Tile;
  future: Tile[];
}

// Плитка 16×16 — 1 КБ, так что сотня шагов почти ничего не стоит.
const LIMIT = 100;

export const startHistory = (tile: Tile): TileHistory => ({
  past: [],
  present: tile,
  future: [],
});

export function commit(history: TileHistory, tile: Tile): TileHistory {
  if (tile === history.present) return history;
  return {
    past: [...history.past, history.present].slice(-LIMIT),
    present: tile,
    future: [],
  };
}

// Мазок идёт без записи в историю: пиксели меняются в present, а снимок до мазка
// сохраняет commitStroke по отпусканию.
export const preview = (history: TileHistory, tile: Tile): TileHistory => ({
  ...history,
  present: tile,
});

export function commitStroke(history: TileHistory, before: Tile): TileHistory {
  if (before === history.present) return history;
  return {
    past: [...history.past, before].slice(-LIMIT),
    present: history.present,
    future: [],
  };
}

export function undo(history: TileHistory): TileHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: TileHistory): TileHistory {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
