import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { isRotation, ROTATIONS } from 'shared';
import PlaceChoicePanel from './PlacePicker/PlaceChoicePanel';
import type { ObjectChoice } from './PlacePicker/placeChoice';
import { blockTraits } from './blockTraits';
import { buildsBlocks, isRegionTool, type EditorTool } from './editorTools';
import { ERASE_MODE_LABELS, ERASE_MODES, type EraseMode } from './eraseModes';
import type { MapEditor } from './useMapEditor';

// Подсказки ластика — по режиму, ниже (ERASE_HINTS).
const HINTS: Record<Exclude<EditorTool, 'erase'>, string> = {
  view: 'Левая кнопка мыши — перемещение, правая — поворот, колесо — масштаб к курсору. Двойной клик (в других инструментах — Alt+клик) переносит центр вращения, Q и E опускают и поднимают его.',
  place:
    'Блок: клик по грани ставит его рядом с ней, клик по земле — на уровень 0. Объект: клик по клетке ставит его. Клик по объекту выделяет его, перетаскивание переносит. R — поворот, Del — удалить, Esc — снять выделение.',
  fill: 'Два клика задают углы области, она заливается блоком.',
  hollow:
    'Два клика задают углы: стены, пол и потолок из блока, внутри — воздух.',
  replace:
    'Два клика по блокам задают углы; блоки как в первом углу заменяются выбранным.',
  walk: 'Клик ставит фигурку. Зелёное — дойдёт: клик делает ход и списывает футы. Оранжевое — не дойдёт: клик переставляет фигурку. Карту инструмент не меняет, фигурка нигде не сохраняется.',
};

const ERASE_HINTS: Record<EraseMode, string> = {
  block: 'Клик по блоку удаляет его.',
  plane:
    'Два клика по противоположным углам стены или пола стирают прямоугольник между ними толщиной в клетку. Клики на одном уровне — пол, на одной линии — стена.',
  region: 'Два клика задают углы области: всё внутри стирается.',
  connected:
    'Клик по блоку стирает всю постройку из того же материала, соединённую с ним гранями.',
};

interface EditorPanelProps {
  editor: MapEditor;
  // Настройки проверки хода — показываются при инструменте «Ход»; на сцене игры его нет.
  walkPanel?: ReactNode;
  // Объекты инструмента «Поставить»: как ставить, свойства выделенного, список.
  objectsPanel: ReactNode;
  // Ставящийся объект; null — блок.
  objectChoice: ObjectChoice | null;
}

// Свойства выбранного инструмента в правой панели страницы карты; сами инструменты,
// отмена и возврат — на сцене (SceneToolbar).
function EditorPanel({
  editor,
  walkPanel,
  objectsPanel,
  objectChoice,
}: EditorPanelProps) {
  const { tool, anchor, eraseMode } = editor;
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
      {tool === 'erase' && (
        <Stack gap={4}>
          <Text size="sm">Режим (клавиша ластика — следующий)</Text>
          <SegmentedControl
            size="xs"
            data={ERASE_MODES.map((mode) => ({
              value: mode,
              label: ERASE_MODE_LABELS[mode],
            }))}
            value={eraseMode}
            onChange={(value) => editor.setEraseMode(value)}
          />
        </Stack>
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

      <Text size="xs" c="dimmed">
        {tool === 'erase' ? ERASE_HINTS[eraseMode] : HINTS[tool]}
      </Text>

      {editor.notice && (
        <Text size="sm" c="orange">
          {editor.notice}
        </Text>
      )}

      {anchor && (
        <Group
          gap="xs"
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
        >
          <Text size="sm" flex={1}>
            Первый угол: {anchor.cell.join(', ')}
            {anchor.match &&
              ` — заменяем «${catalog.describe(anchor.match)?.label ?? anchor.match}»`}
          </Text>
          <Button
            size="xs"
            variant="subtle"
            flex="none"
            onClick={editor.cancelRegion}
          >
            Сбросить (Esc)
          </Button>
        </Group>
      )}
    </Stack>
  );
}

export default EditorPanel;
