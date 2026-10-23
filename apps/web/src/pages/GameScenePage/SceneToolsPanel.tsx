import { Alert, Stack } from '@mantine/core';
import type { MapObjectRefsView } from 'shared';
import type { HoverStore } from '../../features/maps/MapScene/hoverStore';
import type { Point } from '../../features/maps/cameraView';
import {
  EditorPanel,
  ObjectsPanel,
  type MapEditor,
  type ObjectTool,
} from '../../features/maps/editor';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';

interface SceneToolsPanelProps {
  editor: MapEditor;
  objects: ObjectTool;
  state: MapViewState;
  refs: MapObjectRefsView;
  busy: boolean;
  // Правка не прошла; сцена остаётся на месте.
  editError: string | null;
  // Перенести центр камеры к объекту из списка «На карте».
  onFocus: (point: Point) => void;
  // Клетка под курсором сцены — «Под курсором» и подсчёт области.
  hover: HoverStore;
}

// Свойства инструмента мастера на странице сцены (docs/plan/done/game.md, этап 6) — как в
// правой панели редактора карты: ошибка правки, шапка инструмента, блок или объекты.
function SceneToolsPanel({
  editor,
  objects,
  state,
  refs,
  busy,
  editError,
  onFocus,
  hover,
}: SceneToolsPanelProps) {
  return (
    <Stack gap="sm">
      {editError && <Alert color="red">{editError}</Alert>}
      <EditorPanel
        editor={editor}
        objectChoice={objects.settings.choice}
        state={state}
        hover={hover}
        objectsPanel={
          <ObjectsPanel
            tool={objects}
            state={state}
            refs={refs}
            busy={busy}
            onFocus={onFocus}
          />
        }
      />
    </Stack>
  );
}

export default SceneToolsPanel;
