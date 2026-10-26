import { SegmentedControl, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { ReactNode } from 'react';
import { isRotation, ROTATIONS, type SizedMapState } from 'shared';
import type { HoverStore } from '../MapScene/hoverStore';
import PlaceChoicePanel from './PlacePicker/PlaceChoicePanel';
import type { ObjectChoice } from './PlacePicker/placeChoice';
import { blockTraits } from './blockTraits';
import { buildsBlocks, isBuildMode } from './editorTools';
import { EMPTY_PLACE_HINT, firstClickHint } from './ToolPanel/toolTexts';
import {
  AnchorCard,
  BuildModePicker,
  CursorBlockCard,
  EraseModePicker,
  HeightStepper,
  SectionLabel,
  ToolHeader,
} from './ToolPanel';
import type { MapEditor } from './useMapEditor';

interface EditorPanelProps {
  editor: MapEditor;
  // Настройки проверки хода — показываются при инструменте «Ход»; на сцене игры его нет.
  walkPanel?: ReactNode;
  // Объекты инструмента «Поставить»: как ставить, свойства выделенного, список.
  objectsPanel: ReactNode;
  // Сцена игры: панель «Существ» и выбранное в «Просмотре» (под «Под курсором»).
  creaturesPanel?: ReactNode;
  viewPanel?: ReactNode;
  // Сцена игры: в окне «Строить» нет существ — их ставят «Существа».
  withoutCreatures?: boolean;
  // Ставящийся объект; null — блок.
  objectChoice: ObjectChoice | null;
  // Карта и клетка под курсором: «Под курсором» в «Просмотре» и подсчёт области до
  // второго щелчка (docs/plan/done/scene-page.md, этап 3).
  state: SizedMapState | null;
  hover: HoverStore | null;
}

// Свойства выбранного инструмента в правой панели страницы карты и сцены игры; сами
// инструменты, отмена и возврат — на сцене (SceneToolbar), что сделает щелчок — на плашке
// сцены (ToolHint, docs/plan/done/scene-page.md, этап 3).
function EditorPanel({
  editor,
  walkPanel,
  objectsPanel,
  creaturesPanel,
  viewPanel,
  withoutCreatures,
  objectChoice,
  state,
  hover,
}: EditorPanelProps) {
  const { tool, eraseMode } = editor;
  // Та же граница, что у страницы: на телефоне плашки инструмента на сцене нет.
  const narrow = useMediaQuery('(max-width: 48em)');
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
      <ToolHeader
        tool={tool}
        tools={editor.tools}
        hint={
          narrow
            ? editor.anchor
              ? 'Касание — второй угол'
              : editor.placeEmpty
                ? EMPTY_PLACE_HINT
                : firstClickHint(
                    tool,
                    eraseMode,
                    tool === 'creatures'
                      ? editor.placesCreature
                      : objectChoice !== null,
                    true,
                  )
            : undefined
        }
      />

      {/* Начатая область — сразу под шапкой: на телефоне иначе её не видно за режимами. */}
      <AnchorCard editor={editor} state={state} hover={hover} />

      {tool === 'view' && <CursorBlockCard state={state} hover={hover} />}
      {tool === 'view' && viewPanel}
      {tool === 'creatures' && creaturesPanel}

      {tool === 'erase' && (
        <EraseModePicker mode={eraseMode} onChange={editor.setEraseMode} />
      )}

      {isBuildMode(tool) && (
        <BuildModePicker mode={tool} onChange={editor.setTool} />
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
          empty={editor.placeEmpty}
          onClear={editor.clearPlace}
          withoutCreatures={withoutCreatures}
        />
      )}

      {placesBlock && traits && (
        <Text size="xs" c="orange">
          {traits}
        </Text>
      )}

      {placesBlock && catalog.describe(editor.block)?.shape !== 'cube' && (
        <Stack gap={6}>
          <SectionLabel title="Поворот" hotkey="R" />
          <SegmentedControl
            size="xs"
            fullWidth
            data={ROTATIONS.map((r) => ({ value: String(r), label: `${r}°` }))}
            value={String(editor.rotation)}
            onChange={(value) => {
              const rotation = Number(value);
              if (isRotation(rotation)) editor.setRotation(rotation);
            }}
          />
          <Text size="xs" c="dimmed">
            По часовой, 0° — к северу
          </Text>
        </Stack>
      )}

      {/* У «Области» и «Коробки» высоты нет: область — от угла до угла (пользователь,
          2026-10-24). */}
      {(tool === 'replace' || erasesRegion) && (
        <HeightStepper value={editor.height} onChange={editor.setHeight} />
      )}

      {tool === 'walk' && walkPanel}
      {tool === 'place' && objectsPanel}

      {editor.notice && (
        <Text size="sm" c="orange">
          {editor.notice}
        </Text>
      )}
    </Stack>
  );
}

export default EditorPanel;
