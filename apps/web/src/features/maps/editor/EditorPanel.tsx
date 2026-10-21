import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { ReactNode } from 'react';
import {
  BLOCK_CATALOG,
  getBlock,
  isRotation,
  MATERIALS,
  ROTATIONS,
} from 'shared';
import { blockTraits } from './blockTraits';
import { isRegionTool, type EditorTool } from './editorTools';
import type { MapEditor } from './useMapEditor';

// Каталог блоков, сгруппированный по материалу.
const BLOCK_OPTIONS = Object.values(MATERIALS).map((material) => ({
  group: material.label,
  items: [...BLOCK_CATALOG.values()]
    .filter((block) => MATERIALS[block.material] === material)
    .map((block) => ({ value: block.name, label: block.label })),
}));

const HINTS: Record<EditorTool, string> = {
  view: 'Левая кнопка мыши — перемещение, правая — поворот, колесо — масштаб к курсору. Двойной клик (в других инструментах — Alt+клик) переносит центр вращения, Q и E опускают и поднимают его.',
  place: 'Клик по грани ставит блок рядом с ней, клик по земле — на уровень 0.',
  erase: 'Клик по блоку удаляет его.',
  fill: 'Два клика задают углы области, она заливается блоком.',
  hollow:
    'Два клика задают углы: стены, пол и потолок из блока, внутри — воздух.',
  replace:
    'Два клика по блокам задают углы; блоки как в первом углу заменяются выбранным.',
  objects:
    'Клик по клетке ставит выбранное. Клик по объекту выделяет его, перетаскивание переносит. R — взгляд, Del — удалить, Esc — снять выделение.',
  walk: 'Клик ставит фигурку. Зелёное — дойдёт: клик делает ход и списывает футы. Оранжевое — не дойдёт: клик переставляет фигурку. Карту инструмент не меняет, фигурка нигде не сохраняется.',
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
  const { tool, anchor } = editor;
  const builds =
    tool !== 'view' &&
    tool !== 'erase' &&
    tool !== 'walk' &&
    tool !== 'objects';

  return (
    <Stack gap="sm">
      {builds && (
        <Select
          label="Блок"
          data={BLOCK_OPTIONS}
          value={editor.block}
          onChange={(value) => value && editor.setBlock(value)}
          searchable
          allowDeselect={false}
          maxDropdownHeight={320}
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

      {isRegionTool(tool) && (
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
        {HINTS[tool]}
      </Text>

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
