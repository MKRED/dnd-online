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
  master: boolean;
  // Инструмент мастера: фигурки он водит только в «Просмотре».
  editorTool: string;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
}

// Фигурки на странице сцены (docs/plan/done/game.md, этап 7): чтение, выбор и ход, тени чужих
// перетаскиваний. В других инструментах мастера щелчок правит карту — выбор снимается.
export function useScenePlay({
  gameId,
  sceneId,
  master,
  editorTool,
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
    master,
    state,
    refs,
    figures: figures.figures,
    api,
    onFigures: figures.apply,
    onDrag: sendDrag,
  });
  const active = !master || editorTool === 'view';
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
