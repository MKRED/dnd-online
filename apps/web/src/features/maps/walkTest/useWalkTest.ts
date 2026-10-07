import { useCallback, useMemo, useState } from 'react';
import {
  reachable,
  standHeight,
  type BodyBox,
  type CreatureSize,
  type MapState,
  type Reach,
  type Vec3,
} from 'shared';
import type { PickedCells } from '../editor/editorTools';
import { reachTiles, type ReachTile } from './reachTiles';
import { walkBody, walkTarget } from './walkTarget';

// Фигурка в сцене: тело и можно ли ему тут стоять (после правки карты или смены
// размера место может стать негодным — тогда фигурка красная, но не пропадает).
export interface WalkToken {
  body: BodyBox;
  ok: boolean;
}

export interface WalkScene {
  token: WalkToken;
  // Достижимые позиции; budget — сколько футов осталось (для цвета плиток).
  tiles: ReachTile[];
  budget: number;
}

export const DEFAULT_SPEED = 30;

// Проверка хода в редакторе: фигурка, которую мастер водит по карте, чтобы
// увидеть правила пути в деле. Нигде не сохраняется и живёт в открытой вкладке.
export function useWalkTest(state: MapState | null) {
  const [size, setSize] = useState<CreatureSize>('medium');
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [anchor, setAnchor] = useState<Vec3 | null>(null);
  const [spent, setSpent] = useState(0);

  // Карта после каждой правки — новый объект, так что фигурка пересчитывается
  // и на правки, и на смену размера.
  const token = useMemo<WalkToken | null>(() => {
    if (!state || !anchor) return null;
    return {
      body: walkBody(state, anchor, size),
      ok: standHeight(state, anchor, size) !== null,
    };
  }, [state, anchor, size]);

  // Куда фигурка дойдёт на оставшиеся футы. Пересчёт — на постановку, ход, правку
  // карты и смену настроек, а не на движение мыши.
  const left = Math.max(0, speed - spent);
  const reach = useMemo<Reach[]>(
    () =>
      state && anchor && token?.ok ? reachable(state, anchor, size, left) : [],
    [state, anchor, size, left, token?.ok],
  );

  // Всё, что сцена рисует от проверки хода.
  const scene = useMemo<WalkScene | null>(
    () =>
      state && token
        ? { token, tiles: reachTiles(state, reach, size), budget: left }
        : null,
    [state, token, reach, size, left],
  );

  // Подсветка под курсором: где встанет фигурка и можно ли там стоять.
  const preview = useCallback(
    (cells: PickedCells): WalkToken | null => {
      if (!state) return null;
      const target = walkTarget(state, cells, size);
      return { body: walkBody(state, target.anchor, size), ok: target.ok };
    },
    [state, size],
  );

  // Клик ставит фигурку туда, где можно стоять, и начинает новый ход.
  const pick = useCallback(
    (cells: PickedCells) => {
      if (!state) return;
      const target = walkTarget(state, cells, size);
      if (!target.ok) return;
      setAnchor(target.anchor);
      setSpent(0);
    },
    [state, size],
  );

  return {
    size,
    setSize,
    speed,
    setSpeed,
    anchor,
    token,
    reach,
    scene,
    spent,
    newTurn: () => setSpent(0),
    remove: () => {
      setAnchor(null);
      setSpent(0);
    },
    preview,
    pick,
  };
}

export type WalkTest = ReturnType<typeof useWalkTest>;
