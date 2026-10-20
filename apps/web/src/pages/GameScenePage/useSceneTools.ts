import type { MapObjectRefsView } from 'shared';
import {
  EDITOR_TOOLS,
  useMapEditor,
  useObjectTool,
} from '../../features/maps/editor';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import type { useMapEdits } from '../../features/maps/useMapEdits';

// Инструменты на странице сцены — те же, что в редакторе карты, без «Хода»: фигурки
// придут с этапом 7, а размер сцены в игре не меняется (docs/plan/game.md, этап 6).
export const SCENE_TOOLS = EDITOR_TOOLS.filter((tool) => tool !== 'walk');

const nothing = () => undefined;

interface SceneToolsOptions {
  // Инструменты — только у мастера; у игрока клавиши молчат, а Ctrl+Z ничего не шлёт.
  master: boolean;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  edits: ReturnType<typeof useMapEdits>;
}

export function useSceneTools({
  master,
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
    keysActive: master,
    tools: SCENE_TOOLS,
  });
  return { editor, objects };
}
