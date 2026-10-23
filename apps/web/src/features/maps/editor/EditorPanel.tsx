import { NumberInput, SegmentedControl, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { isRotation, ROTATIONS, type SizedMapState } from 'shared';
import type { HoverStore } from '../MapScene/hoverStore';
import PlaceChoicePanel from './PlacePicker/PlaceChoicePanel';
import type { ObjectChoice } from './PlacePicker/placeChoice';
import { blockTraits } from './blockTraits';
import { buildsBlocks, isRegionTool } from './editorTools';
import {
  AnchorCard,
  CursorBlockCard,
  EraseModePicker,
  ToolHeader,
} from './ToolPanel';
import type { MapEditor } from './useMapEditor';

interface EditorPanelProps {
  editor: MapEditor;
  // Настройки проверки хода — показываются при инструменте «Ход»; на сцене игры его нет.
  walkPanel?: ReactNode;
  // Объекты инструмента «Поставить»: как ставить, свойства выделенного, список.
  objectsPanel: ReactNode;
  // Ставящийся объект; null — блок.
  objectChoice: ObjectChoice | null;
  // Карта и клетка под курсором: «Под курсором» в «Просмотре» и подсчёт области до
  // второго щелчка (docs/plan/scene-page.md, этап 3).
  state: SizedMapState | null;
  hover: HoverStore | null;
}

// Свойства выбранного инструмента в правой панели страницы карты и сцены игры; сами
// инструменты, отмена и возврат — на сцене (SceneToolbar), что сделает щелчок — на плашке
// сцены (ToolHint, docs/plan/scene-page.md, этап 3).
function EditorPanel({
  editor,
  walkPanel,
  objectsPanel,
  objectChoice,
  state,
  hover,
}: EditorPanelProps) {
  const { tool, eraseMode } = editor;
  // Высоту задают у области ластика; стена стирается до самого верха.
  const erasesRegion = tool === 'erase' && eraseMode === 'region';
  const builds = buildsBlocks(tool);
  // «Поставить» ставит блок или объект; заливка, коробка и замена — всегда блок.
  const placesBlock = builds && (tool !== 'place' || objectChoice === null);
  // Блоки описывает каталог карты: у своих блоков подписи, форма и свойства группы.
  const { catalog } = editor;
  const traits = blockTraits(editor.block, catalog);

  return (
    <Stack gap="sm">
      <ToolHeader tool={tool} />

      {tool === 'view' && <CursorBlockCard state={state} hover={hover} />}

      {tool === 'erase' && (
        <EraseModePicker mode={eraseMode} onChange={editor.setEraseMode} />
      )}

      {builds && (
        <PlaceChoicePanel
          catalog={catalog}
          block={editor.block}
          rotation={editor.rotation}
          choice={objectChoice}
          recent={editor.recentPlace}
          blocksOnly={tool !== 'place'}
          opened={editor.pickerOpen}
          onOpen={() => editor.setPickerOpen(true)}
          onClose={() => editor.setPickerOpen(false)}
          onPickBlock={editor.pickBlock}
          onPickObject={editor.pickObject}
          onSelectRecent={editor.selectRecent}
        />
      )}

      {placesBlock && traits && (
        <Text size="xs" c="orange">
          {traits}
        </Text>
      )}

      {placesBlock && catalog.describe(editor.block)?.shape !== 'cube' && (
        <Stack gap={4}>
          <Text size="sm">Поворот (R) — по часовой, 0° — к северу</Text>
          <SegmentedControl
            size="xs"
            data={ROTATIONS.map((r) => ({ value: String(r), label: `${r}°` }))}
            value={String(editor.rotation)}
            onChange={(value) => {
              const rotation = Number(value);
              if (isRotation(rotation)) editor.setRotation(rotation);
            }}
          />
        </Stack>
      )}

      {(isRegionTool(tool) || erasesRegion) && (
        <NumberInput
          label="Высота области"
          description="Слоёв над верхним углом, включая его"
          min={1}
          max={64}
          value={editor.height}
          onChange={(value) =>
            editor.setHeight(Math.max(1, Number(value) || 1))
          }
        />
      )}

      {tool === 'walk' && walkPanel}
      {tool === 'place' && objectsPanel}

      {editor.notice && (
        <Text size="sm" c="orange">
          {editor.notice}
        </Text>
      )}

      <AnchorCard editor={editor} state={state} hover={hover} />
    </Stack>
  );
}

export default EditorPanel;
