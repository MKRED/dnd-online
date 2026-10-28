import type { BodyBox, Box3, Point3 } from 'shared';

// Что нужно лучу дальней атаки (TargetBeam): где грудь атакующего, тела атакующего и
// целей, и на какую цель сейчас навели. Слои существ и фигурок пишут сюда свои точки:
// раскладка мест уже посчитана там, а луч рисуется отдельно от обоих слоёв.
export interface AimPoint {
  point: Point3;
  // Клетки тела — для расстояния до пустой клетки под курсором.
  cells: Box3;
  // Тело — для линии выстрела тем же расчётом, что укрытие на сервере (attackLine).
  body: BodyBox;
}

export interface AimStore {
  version: () => number;
  hovered: () => string | null;
  hover: (key: string) => void;
  leave: (key: string) => void;
  place: (layer: string, points: ReadonlyMap<string, AimPoint>) => void;
  point: (key: string) => AimPoint | null;
  subscribe: (listener: () => void) => () => void;
}

export function createAimStore(): AimStore {
  let version = 0;
  let hovered: string | null = null;
  const layers = new Map<string, ReadonlyMap<string, AimPoint>>();
  const listeners = new Set<() => void>();
  const changed = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };
  return {
    version: () => version,
    hovered: () => hovered,
    hover: (key) => {
      if (hovered === key) return;
      hovered = key;
      changed();
    },
    // Уход с цели снимает наведение, только если не успели навести на другую.
    leave: (key) => {
      if (hovered !== key) return;
      hovered = null;
      changed();
    },
    place: (layer, points) => {
      layers.set(layer, points);
      changed();
    },
    point: (key) => {
      for (const points of layers.values()) {
        const found = points.get(key);
        if (found) return found;
      }
      return null;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
