import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { GameFigureDragMessage, MapObjectRefsView, Vec3 } from 'shared';
import { figureApi } from '../../../features/games';
import type { FigureDragHandlers } from '../../../features/maps/MapScene';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { useKeyCodes } from '../../../features/maps/useKeyCodes';
import { useFigureGhosts } from './useFigureGhosts';
import { useFigureTool } from './useFigureTool';
import { useSceneFigures } from './useSceneFigures';

interface ScenePlayOptions {
  gameId: string;
  sceneId: string | null;
  // Фигурки можно выбирать: у мастера — в «Игре» и в «Просмотре» «Правки»; при других
  // инструментах щелчок правит карту.
  active: boolean;
  // Мастер в «Правке»: ставит без пути и запаса (docs/plan/done/scene-page.md).
  free: boolean;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
}

// Фигурки на странице сцены (docs/plan/done/game.md, этап 7): чтение, выбор и ход, тени чужих
// перетаскиваний. Пока выбирать нельзя (инструмент «Правки» правит карту) — выбор снимается.
export function useScenePlay({
  gameId,
  sceneId,
  active,
  free,
  state,
  refs,
}: ScenePlayOptions) {
  const figures = useSceneFigures(gameId, sceneId);
  const api = useMemo(() => figureApi(gameId), [gameId]);
  const ghosts = useFigureGhosts(figures.inputs);
  // Отправку позиций перетаскивания даёт комната сокета (SceneRoom).
  const dragSenderRef = useRef<
    ((message: GameFigureDragMessage) => void) | null
  >(null);
  const sendDrag = useCallback(
    (characterId: string, at: Vec3 | null) =>
      dragSenderRef.current?.({ gameId, characterId, at }),
    [gameId],
  );
  const tool = useFigureTool({
    free,
    state,
    refs,
    figures: figures.figures,
    api,
    onFigures: figures.apply,
    onDrag: sendDrag,
  });
  const { select, selectedId, grab, release } = tool;
  useEffect(() => {
    if (!active) select(null);
  }, [active, select]);
  useKeyCodes({ Escape: () => select(null) });

  const drag = useMemo<FigureDragHandlers | undefined>(
    () =>
      active
        ? {
            onGrab: grab,
            onRelease: release,
            onSelect: (id) => select(selectedId === id ? null : id),
          }
        : undefined,
    [active, grab, release, select, selectedId],
  );

  return {
    figures,
    ghosts,
    tool,
    dragSenderRef,
    // Сцене: редактор и подсветка хода выбранной фигурки, обработчики фигурок.
    editor: active ? tool.editor : null,
    walk: active ? tool.scene : null,
    drag,
  };
}
