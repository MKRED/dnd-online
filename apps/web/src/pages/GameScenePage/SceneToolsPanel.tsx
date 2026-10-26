import { Alert, Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import type { GameFigures, MapObjectRefsView } from 'shared';
import type { HoverStore } from '../../features/maps/MapScene/hoverStore';
import type { Point } from '../../features/maps/cameraView';
import {
  EditorPanel,
  ObjectsPanel,
  type MapEditor,
  type ObjectTool,
} from '../../features/maps/editor';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import CreaturesToolPanel from './CreaturesToolPanel';
import type { FigureTool } from './figures';

interface SceneToolsPanelProps {
  editor: MapEditor;
  objects: ObjectTool;
  creatures: ObjectTool;
  figures: GameFigures | null;
  figureTool: FigureTool;
  state: MapViewState;
  refs: MapObjectRefsView;
  busy: boolean;
  // Правка не прошла; сцена остаётся на месте.
  editError: string | null;
  // Перенести центр камеры к объекту из списка «На карте».
  onFocus: (point: Point) => void;
  // Клетка под курсором сцены — «Под курсором» и подсчёт области.
  hover: HoverStore;
  // Выбранное в «Просмотре»: карточка героя или существа.
  selected: ReactNode;
}

// Свойства инструмента мастера на странице сцены (docs/plan/done/game.md, этап 6) — как в
// правой панели редактора карты: ошибка правки, шапка инструмента, блок или объекты. Свои у
// сцены — «Существа» и выбранное в «Просмотре» (замечания после первой партии, 2026-10-26).
function SceneToolsPanel({
  editor,
  objects,
  creatures,
  figures,
  figureTool,
  state,
  refs,
  busy,
  editError,
  onFocus,
  hover,
  selected,
}: SceneToolsPanelProps) {
  return (
    <Stack gap="sm">
      {editError && <Alert color="red">{editError}</Alert>}
      <EditorPanel
        editor={editor}
        objectChoice={objects.settings.choice}
        state={state}
        hover={hover}
        withoutCreatures
        viewPanel={selected}
        creaturesPanel={
          <CreaturesToolPanel
            editor={editor}
            creatures={creatures}
            figures={figures}
            figureTool={figureTool}
            state={state}
            refs={refs}
            busy={busy}
            onFocus={onFocus}
          />
        }
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
