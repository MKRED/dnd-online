import type { Vec3 } from 'shared';

// Клетка под курсором для строки координат. Наведение меняется на каждое движение
// мыши, а строка — обычный DOM поверх Canvas: через это хранилище она
// перерисовывается одна, без сцены и страницы.
export interface HoverStore {
  get: () => Vec3 | null;
  set: (cell: Vec3 | null) => void;
  subscribe: (listener: () => void) => () => void;
}

const sameCell = (a: Vec3 | null, b: Vec3 | null) =>
  a === b || (!!a && !!b && a.every((v, i) => v === b[i]));

export function createHoverStore(): HoverStore {
  let cell: Vec3 | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => cell,
    set: (next) => {
      if (sameCell(cell, next)) return;
      cell = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
