import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { getBlock, isRotation, ROTATIONS } from 'shared';
import BlockPicker from './BlockPicker';
import { blockTraits } from './blockTraits';
import { buildsBlocks, isRegionTool, type EditorTool } from './editorTools';
import { ERASE_MODE_LABELS, ERASE_MODES, type EraseMode } from './eraseModes';
import type { MapEditor } from './useMapEditor';

// Подсказки ластика — по режиму, ниже (ERASE_HINTS).
const HINTS: Record<Exclude<EditorTool, 'erase'>, string> = {
  view: 'Левая кнопка мыши — перемещение, правая — поворот, колесо — масштаб к курсору. Двойной клик (в других инструментах — Alt+клик) переносит центр вращения, Q и E опускают и поднимают его.',
  place: 'Клик по грани ставит блок рядом с ней, клик по земле — на уровень 0.',
  fill: 'Два клика задают углы области, она заливается блоком.',
  hollow:
    'Два клика задают углы: стены, пол и потолок из блока, внутри — воздух.',
  replace:
    'Два клика по блокам задают углы; блоки как в первом углу заменяются выбранным.',
  objects:
    'Клик по клетке ставит выбранное. Клик по объекту выделяет его, перетаскивание переносит. R — взгляд, Del — удалить, Esc — снять выделение.',
  walk: 'Клик ставит фигурку. Зелёное — дойдёт: клик делает ход и списывает футы. Оранжевое — не дойдёт: клик переставляет фигурку. Карту инструмент не меняет, фигурка нигде не сохраняется.',
};

const ERASE_HINTS: Record<EraseMode, string> = {
  block: 'Клик по блоку удаляет его.',
  wall: 'Два клика задают концы стены: стирается вертикальный прямоугольник между ними, толщиной в клетку, вдоль той оси, куда курсор ушёл дальше.',
  region: 'Два клика задают углы области: всё внутри стирается.',
  connected:
    'Клик по блоку стирает всю постройку из того же материала, соединённую с ним гранями.',
};

interface EditorPanelProps {
  editor: MapEditor;
  // Настройки проверки хода — показываются при инструменте «Ход»; на сцене игры его нет.
  walkPanel?: ReactNode;
  // Панель инструмента «Объекты»: что ставить, свойства выделенного, список.
  objectsPanel: ReactNode;
}

// Свойства выбранного инструмента в правой панели страницы карты; сами инструменты,
// отмена и возврат — на сцене (SceneToolbar).
function EditorPanel({ editor, walkPanel, objectsPanel }: EditorPanelProps) {
  const { tool, anchor, eraseMode } = editor;
  const erasesBetween =
    tool === 'erase' && (eraseMode === 'wall' || eraseMode === 'region');
  const builds = buildsBlocks(tool);

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
        <BlockPicker
          block={editor.block}
          rotation={editor.rotation}
          recent={editor.recentBlocks}
          opened={editor.pickerOpen}
          onOpen={() => editor.setPickerOpen(true)}
          onClose={() => editor.setPickerOpen(false)}
          onPick={editor.pickBlock}
          onSelect={editor.setBlock}
        />
      )}

      {builds && blockTraits(editor.block) && (
        <Text size="xs" c="orange">
          {blockTraits(editor.block)}
        </Text>
      )}

      {builds && getBlock(editor.block)?.shape !== 'cube' && (
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

      {(isRegionTool(tool) || erasesBetween) && (
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
      {tool === 'objects' && objectsPanel}

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
              ` — заменяем «${getBlock(anchor.match)?.label ?? anchor.match}»`}
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
