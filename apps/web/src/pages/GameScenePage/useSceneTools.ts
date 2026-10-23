import type { MapObjectRefsView } from 'shared';
import {
  EDITOR_TOOLS,
  useMapEditor,
  useObjectTool,
} from '../../features/maps/editor';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import type { useMapEdits } from '../../features/maps/useMapEdits';

// Инструменты на странице сцены — те же, что в редакторе карты, без «Хода»: фигурки
// придут с этапом 7, а размер сцены в игре не меняется (docs/plan/done/game.md, этап 6).
export const SCENE_TOOLS = EDITOR_TOOLS.filter((tool) => tool !== 'walk');

const nothing = () => undefined;

interface SceneToolsOptions {
  // Инструменты — только у мастера; у игрока клавиши молчат, а Ctrl+Z ничего не шлёт.
  master: boolean;
  // Мастер в «Правке» (docs/plan/scene-page.md): в «Игре» клавиши инструментов молчат, а
  // отмена и возврат остаются — ход тоже отменяется.
  editing: boolean;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  edits: ReturnType<typeof useMapEdits>;
}

export function useSceneTools({
  master,
  editing,
  state,
  refs,
  edits,
}: SceneToolsOptions) {
  const objects = useObjectTool({
    state,
    refs,
    applyOps: edits.applyOps,
  });
  const editor = useMapEditor({
    state: master ? state : null,
    applyOps: edits.applyOps,
    undo: master ? edits.undo : nothing,
    redo: master ? edits.redo : nothing,
    objects,
    keysActive: master && editing,
    tools: SCENE_TOOLS,
  });
  return { editor, objects };
}
