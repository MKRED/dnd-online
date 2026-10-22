import { Paper, Text } from '@mantine/core';
import { useSyncExternalStore } from 'react';
import { cellLabel, regionSizeLabel } from '../editor/cellReadout';
import { anchorBox, type SceneEditor } from '../editor/editorTools';
import type { HoverStore } from './hoverStore';
import classes from './MapScene.module.css';

interface CursorReadoutProps {
  hover: HoverStore;
  editor: SceneEditor | null;
}

// Внизу сцены: клетка под курсором, а пока выбирается область — её размер.
function CursorReadout({ hover, editor }: CursorReadoutProps) {
  const cell = useSyncExternalStore(hover.subscribe, hover.get);
  if (!cell) return null;
  const box = editor && anchorBox(editor, cell);
  const region = box ? regionSizeLabel(box) : null;
  return (
    <Paper className={classes.readout} withBorder shadow="xs" px={6} py={2}>
      <Text size="sm" ff="monospace">
        {cellLabel(cell)}
        {region && ` · ${region}`}
      </Text>
    </Paper>
  );
}

export default CursorReadout;
