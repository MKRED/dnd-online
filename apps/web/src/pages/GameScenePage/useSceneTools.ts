import type { MapObjectRefsView } from 'shared';
import {
  useMapEditor,
  useObjectTool,
  type EditorTool,
  type ObjectTool,
} from '../../features/maps/editor';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import type { useMapEdits } from '../../features/maps/useMapEdits';

// Инструменты на странице сцены: без «Хода» редактора карты (размер сцены в игре не
// меняется, docs/plan/done/game.md, этап 6) и со «Существами» вторыми — ими в игре
// пользуются чаще всего (замечания после первой партии, 2026-10-26).
export const SCENE_TOOLS: readonly EditorTool[] = [
  'view',
  'creatures',
  'place',
  'erase',
  'replace',
];

const nothing = () => undefined;

interface SceneToolsOptions {
  // Инструменты — только у мастера; у игрока клавиши молчат, а Ctrl+Z ничего не шлёт.
  master: boolean;
  // Мастер в «Правке» (docs/plan/done/scene-page.md): в «Игре» клавиши инструментов молчат, а
  // отмена и возврат остаются — ход тоже отменяется.
  editing: boolean;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  edits: ReturnType<typeof useMapEdits>;
  // В «Существах» выбрали или начали ставить монстра или НПС — выбор героя снимается: у
  // щелчка по клетке один адресат.
  onCreatureFocus: () => void;
}

// «Строить» берёт только вещи, «Существа» — монстров и НПС (героев «Существа» водят через
// фигурки, useScenePlay).
export function useSceneTools({
  master,
  editing,
  state,
  refs,
  edits,
  onCreatureFocus,
}: SceneToolsOptions) {
  const objects = useObjectTool({
    state,
    refs,
    applyOps: edits.applyOps,
    scope: 'things',
  });
  const raw = useObjectTool({
    state,
    refs,
    applyOps: edits.applyOps,
    scope: 'creatures',
  });
  const { choose, select, scene } = raw;
  // Сам инструмент новый на каждой отрисовке — обёртка тоже.
  const creatures: ObjectTool = {
    ...raw,
    choose: (choice) => {
      if (choice) onCreatureFocus();
      choose(choice);
    },
    select: (id) => {
      onCreatureFocus();
      select(id);
    },
    scene: {
      ...scene,
      select: (id) => {
        onCreatureFocus();
        scene.select(id);
      },
      grab: (id) => {
        onCreatureFocus();
        scene.grab(id);
      },
    },
  };
  const editor = useMapEditor({
    state: master ? state : null,
    applyOps: edits.applyOps,
    undo: master ? edits.undo : nothing,
    redo: master ? edits.redo : nothing,
    objects,
    creatures,
    keysActive: master && editing,
    tools: SCENE_TOOLS,
  });
  return { editor, objects, creatures };
}
