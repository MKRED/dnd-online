import { Paper, Text } from '@mantine/core';
import { useSyncExternalStore, type ReactNode } from 'react';
import { cellLabel, regionSizeLabel } from '../editor/cellReadout';
import { anchorBox, type SceneEditor } from '../editor/editorTools';
import type { HoverStore } from './hoverStore';
import classes from './MapScene.module.css';

interface CursorReadoutProps {
  hover: HoverStore;
  editor: SceneEditor | null;
  // false — без строки координат (сцена игры в «Игре»: там они не нужны).
  show: boolean;
  // Что стоит в той же строке правее координат — плашка инструмента: так они не наезжают
  // друг на друга (вариант А, 2026-10-24, docs/plan/scene-page.md, «Телефон»).
  after?: ReactNode;
}

// Внизу сцены: клетка под курсором, а пока выбирается область — её размер; правее —
// плашка инструмента.
function CursorReadout({ hover, editor, show, after }: CursorReadoutProps) {
  const cell = useSyncExternalStore(hover.subscribe, hover.get);
  const box = cell && editor && anchorBox(editor, cell);
  // Размер области скажет плашка инструмента правее — здесь только клетка.
  const region = box && !after ? regionSizeLabel(box) : null;
  if (!(show && cell) && !after) return null;
  return (
    <div className={classes.readout}>
      {show && cell && (
        <Paper withBorder shadow="xs" px={6} py={2} className={classes.cell}>
          <Text size="sm" ff="monospace">
            {cellLabel(cell)}
            {region && ` · ${region}`}
          </Text>
        </Paper>
      )}
      {after}
    </div>
  );
}

export default CursorReadout;
