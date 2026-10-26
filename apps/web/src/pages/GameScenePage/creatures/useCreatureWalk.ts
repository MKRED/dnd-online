import { useCallback, useMemo, useState } from 'react';
import {
  FIGURE_SIZE,
  movementAllowance,
  reachable,
  standHeight,
  type CreatureSize,
  type GameCreatures,
  type GameFigures,
  type MapObjectRefsView,
  type Occupant,
  type Reach,
  type Vec3,
} from 'shared';
import type {
  PickedCells,
  SceneEditor,
} from '../../../features/maps/editor/editorTools';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import type { WalkScene } from '../../../features/maps/walkTest';
import { reachTiles } from '../../../features/maps/walkTest/reachTiles';
import { walkBody } from '../../../features/maps/walkTest/walkTarget';
import {
  changeGameCreatureAllowance,
  moveGameCreature,
} from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';
import { figureHover } from '../figures/figureHover';
import { sceneOccupants } from '../figures/sceneOccupants';

interface CreatureWalkOptions {
  gameId: string;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  creatures: GameCreatures | null;
  figures: GameFigures | null;
  // Существо, выбранное мастером; ход — только в «Просмотре».
  selectedId: number | null;
  active: boolean;
  // Ответ правки — существа сцены: показать сразу, не дожидаясь сокета.
  onCreatures: (creatures: GameCreatures) => void;
  // Касание мимо подсвеченных клеток снимает выбор: на телефоне нет Esc (2026-10-24).
  onMiss: () => void;
  // Ход отправлен: существо ждёт свой путь на месте (docs/plan/done/walk-animation.md).
  onMoveStart?: (objectId: number, from: Vec3) => void;
}

// Ход выбранного мастером монстра или НПС (docs/plan/done/creature-movement.md): куда оно
// дойдёт на оставшийся запас, путь под курсором и ход по клику — как у фигурки игрока.
// Мешают персонажи игроков; другие монстры и НПС — союзники. Поверженный не ходит.
export function useCreatureWalk({
  gameId,
  state,
  refs,
  creatures,
  figures,
  selectedId,
  active,
  onCreatures,
  onMiss,
  onMoveStart,
}: CreatureWalkOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entry =
    creatures?.creatures.find((c) => c.objectId === selectedId) ?? null;
  const object =
    selectedId !== null ? state?.objects.byId.get(selectedId) : null;
  const mover = useMemo(() => {
    if (!active || !entry?.state || !object || entry.health === 'down') {
      return null;
    }
    if (object.kind !== 'monster' && object.kind !== 'npc') return null;
    const size: CreatureSize =
      object.kind === 'npc'
        ? object.size
        : (refs?.monsters[object.monsterId]?.size ?? 'medium');
    return {
      id: object.id,
      at: object.at,
      size,
      left: movementAllowance(entry.state.movement),
    };
  }, [active, entry, object, refs]);

  const others = useMemo<Occupant[]>(
    () =>
      state && refs && mover
        ? [
            ...sceneOccupants(state, refs, mover.id).map((o) => ({
              ...o,
              ally: true,
            })),
            ...(figures?.figures ?? []).map((f) => ({
              at: f.at,
              size: FIGURE_SIZE,
              ally: false,
            })),
          ]
        : [],
    [state, refs, mover, figures],
  );

  // Достижимые позиции — пересчёт на ход и правку карты, не на движение мыши.
  const reach = useMemo<Reach[]>(
    () =>
      state && mover
        ? reachable(state, mover.at, mover.size, mover.left, others)
        : [],
    [state, mover, others],
  );

  const scene = useMemo<WalkScene | null>(() => {
    if (!state || !mover) return null;
    return {
      token: {
        body: walkBody(state, mover.at, mover.size),
        ok: standHeight(state, mover.at, mover.size) !== null,
      },
      tiles: reachTiles(
        state,
        reach.filter((r) => r.end),
        mover.size,
      ),
      budget: Math.max(mover.left.walk, mover.left.climb ?? 0),
    };
  }, [state, mover, reach]);

  const preview = useCallback(
    (cells: PickedCells) =>
      state && mover
        ? figureHover(state, reach, cells, mover.size, others, false, mover.at)
        : null,
    [state, mover, reach, others],
  );

  // Правки по одной: пока запрос в пути, новые не принимаются.
  const run = useCallback(
    (request: () => Promise<GameCreatures>, failure: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      request()
        .then(onCreatures)
        .catch((err: unknown) => {
          console.error(failure, err);
          setError(errorMessage(err, failure));
        })
        .finally(() => setBusy(false));
    },
    [busy, onCreatures],
  );

  const pick = useCallback(
    (cells: PickedCells) => {
      const hover = preview(cells);
      if (!mover) return;
      if (hover?.kind !== 'move') {
        onMiss();
        return;
      }
      const to: Vec3 = hover.anchor;
      if (!busy) onMoveStart?.(mover.id, mover.at);
      run(
        () => moveGameCreature(gameId, mover.id, to),
        'Не удалось сделать ход',
      );
    },
    [preview, mover, run, gameId, onMiss, busy, onMoveStart],
  );

  const editor = useMemo<SceneEditor | null>(
    () =>
      mover
        ? { tool: 'walk', anchor: null, height: 1, onPick: pick, preview }
        : null,
    [mover, pick, preview],
  );

  const allowance = (objectId: number, change: 'refresh' | 'dash') =>
    run(
      () => changeGameCreatureAllowance(gameId, objectId, change),
      change === 'dash'
        ? 'Не удалось дать «Рывок»'
        : 'Не удалось обновить запас',
    );

  return { editor, scene, busy, error, allowance, moving: mover !== null };
}
