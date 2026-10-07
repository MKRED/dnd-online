import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
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
import {
  EDITOR_TOOLS,
  isRegionTool,
  TOOL_LABELS,
  type EditorTool,
} from './editorTools';
import type { MapEditor } from './useMapEditor';

// Каталог блоков, сгруппированный по материалу.
const BLOCK_OPTIONS = Object.values(MATERIALS).map((material) => ({
  group: material.label,
  items: [...BLOCK_CATALOG.values()]
    .filter((block) => MATERIALS[block.material] === material)
    .map((block) => ({ value: block.name, label: block.label })),
}));

const HINTS: Record<EditorTool, string> = {
  view: 'Левая кнопка мыши — перемещение, правая — поворот, колесо — масштаб.',
  place: 'Клик по грани ставит блок рядом с ней, клик по земле — на уровень 0.',
  erase: 'Клик по блоку удаляет его.',
  fill: 'Два клика задают углы области, она заливается блоком.',
  hollow:
    'Два клика задают углы: стены, пол и потолок из блока, внутри — воздух.',
  replace:
    'Два клика по блокам задают углы; блоки как в первом углу заменяются выбранным.',
  walk: 'Клик ставит фигурку. Карту инструмент не меняет, фигурка нигде не сохраняется.',
};

interface EditorPanelProps {
  editor: MapEditor;
  busy: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Настройки проверки хода — показываются при инструменте «Ход».
  walkPanel: ReactNode;
}

// Инструменты редактора мастера в правой панели страницы карты.
function EditorPanel({
  editor,
  busy,
  onUndo,
  onRedo,
  walkPanel,
}: EditorPanelProps) {
  const { tool, anchor } = editor;
  const builds = tool !== 'view' && tool !== 'erase' && tool !== 'walk';

  return (
    <Stack gap="sm">
      <SimpleGrid cols={3} spacing={6}>
        {EDITOR_TOOLS.map((value) => (
          <Button
            key={value}
            size="xs"
            variant={tool === value ? 'filled' : 'default'}
            aria-pressed={tool === value}
            onClick={() => editor.setTool(value)}
          >
            {TOOL_LABELS[value]}
          </Button>
        ))}
      </SimpleGrid>

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

      {builds && getBlock(editor.block)?.shape !== 'cube' && (
        <Stack gap={4}>
          <Text size="sm">Поворот (по часовой, 0° — к северу)</Text>
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
            Сбросить
          </Button>
        </Group>
      )}

      <Group gap="xs" grow>
        <Button variant="default" size="xs" disabled={busy} onClick={onUndo}>
          Отменить
        </Button>
        <Button variant="default" size="xs" disabled={busy} onClick={onRedo}>
          Вернуть
        </Button>
      </Group>
    </Stack>
  );
}

export default EditorPanel;
