import { Group, Kbd, Paper, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Fragment } from 'react';
import type { SizedMapState } from 'shared';
import type { HoverStore } from '../../MapScene/hoverStore';
import { buildsBlocks } from '../editorTools';
import type { MapEditor } from '../useMapEditor';
import { EMPTY_PLACE_HINT, firstClickHint, previewText } from './toolTexts';
import { useRegionPreview } from './useRegionPreview';
import classes from './ToolPanel.module.css';

interface ToolHintProps {
  editor: MapEditor;
  state: SizedMapState | null;
  hover: HoverStore | null;
  // Ставится объект, а не блок: у него свои клавиши.
  placesObject: boolean;
}

const SECOND_CLICK = {
  fill: 'второй щелчок зальёт',
  hollow: 'второй щелчок построит',
  replace: 'второй щелчок заменит',
  erase: 'второй щелчок сотрёт',
} as const;

// Плашка инструмента внизу сцены (docs/plan/done/scene-page.md, этап 3): что сделает следующий
// щелчок и клавиши к нему — вместо абзаца подсказки в панели.
function ToolHint({ editor, state, hover, placesObject }: ToolHintProps) {
  const preview = useRegionPreview(editor, state, hover);
  const narrow = useMediaQuery('(max-width: 48em)');
  const { tool, anchor } = editor;
  // На телефоне на сцене ни плашки, ни координат: подсказка — в шапке инструмента,
  // подсчёт — в карточке первого угла в панели (выбрано 2026-10-23, docs/plan/done/scene-page.md,
  // «Телефон»).
  if (narrow) return null;
  const keys: [string, string][] = [];
  let text: string;
  if (anchor) {
    const second =
      tool in SECOND_CLICK
        ? SECOND_CLICK[tool as keyof typeof SECOND_CLICK]
        : 'второй щелчок';
    text = preview
      ? `${previewText(tool, preview)} · ${second}`
      : `Первый угол выбран · ${second}`;
    keys.push(['Esc', 'сбросить угол']);
  } else {
    text = editor.placeEmpty
      ? EMPTY_PLACE_HINT
      : firstClickHint(tool, editor.eraseMode, placesObject);
    if (tool === 'view') keys.push(['Q E', 'центр ниже / выше']);
    if (editor.placeEmpty) {
      keys.push(['B', 'выбрать']);
    } else if (tool === 'place' && placesObject) {
      keys.push(
        ['R', 'поворот'],
        ['Del', 'удалить'],
        ['B', 'выбрать'],
        ['Esc', 'снять'],
      );
    } else if (buildsBlocks(tool)) {
      keys.push(['R', 'поворот'], ['B', 'выбрать']);
      if (tool === 'place') keys.push(['Esc', 'снять']);
    }
  }
  return (
    <Paper
      className={classes.hint}
      withBorder
      shadow="sm"
      role="status"
      aria-label="Подсказка инструмента"
    >
      <Text size="sm" truncate className={classes.text}>
        {text}
      </Text>
      {keys.map(([key, what]) => (
        <Fragment key={key}>
          <Group gap={2} wrap="nowrap">
            {key.split(' ').map((k) => (
              <Kbd key={k} size="xs">
                {k}
              </Kbd>
            ))}
          </Group>
          <Text size="sm" c="dimmed">
            {what}
          </Text>
        </Fragment>
      ))}
    </Paper>
  );
}

export default ToolHint;
