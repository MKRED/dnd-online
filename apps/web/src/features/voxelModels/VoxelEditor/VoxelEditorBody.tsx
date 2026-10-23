import { Alert, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { useEffect, useMemo } from 'react';
import type { VoxelModelFields } from 'shared';
import { useKeyCodes } from '../../maps';
import { PIXEL_PALETTE } from '../../simpleCatalog/BlockGroup/TileEditor/pixelPalette';
import TilePalette from '../../simpleCatalog/BlockGroup/TileEditor/TilePalette';
import { modelColors } from '../voxelGrid';
import { useVoxelEditor } from './useVoxelEditor';
import VoxelBrushControls from './VoxelBrushControls';
import VoxelCellControls from './VoxelCellControls';
import classes from './VoxelEditor.module.css';
import VoxelEditorScene from './VoxelEditorScene';
import VoxelSizeControls from './VoxelSizeControls';
import VoxelToolbar from './VoxelToolbar';
import { VOXEL_TOOLS } from './voxelTools';

export interface VoxelEditorBodyProps {
  model: VoxelModelFields;
  confirmClose: boolean;
  onDirty: (dirty: boolean) => void;
  onKeepEditing: () => void;
  onCancel: () => void;
  onDiscard: () => void;
  onDone: (model: VoxelModelFields) => void;
}

// Содержимое окна редактора модели: монтируется заново на каждое открытие, поэтому
// сетка и история всегда начинаются с модели формы.
function VoxelEditorBody(props: VoxelEditorBodyProps) {
  const { model, confirmClose, onDirty } = props;
  const editor = useVoxelEditor(
    model,
    model.palette[0] ?? PIXEL_PALETTE[1].colors[2],
  );
  useEffect(() => onDirty(editor.dirty), [onDirty, editor.dirty]);
  const { grid, change } = editor;
  const colors = useMemo(
    () => modelColors(grid, 16),
    // Правки красят воксели на месте: пересчёт по номеру версии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid, change.version],
  );

  useKeyCodes(
    Object.fromEntries(
      VOXEL_TOOLS.map(({ code, tool }) => [code, () => editor.setTool(tool)]),
    ),
  );
  useHotkeys([
    ['mod+Z', editor.undo],
    ['mod+shift+Z', editor.redo],
    ['mod+Y', editor.redo],
  ]);

  return (
    <div className={classes.layout}>
      <div className={classes.scene}>
        <VoxelEditorScene editor={editor} />
        <Text size="xs" c="dimmed" className={classes.hint}>
          Левая кнопка — инструмент · правая — повернуть · колесо — приблизить ·
          средняя — сдвинуть. На телефоне камера — двумя пальцами.
        </Text>
      </div>
      <Stack gap="md" className={classes.panel}>
        <VoxelToolbar editor={editor} />
        {editor.notice && (
          <Alert color="yellow" p="xs">
            {editor.notice}
          </Alert>
        )}
        {editor.tool === 'cells' ? (
          <VoxelCellControls editor={editor} />
        ) : (
          <>
            <VoxelBrushControls editor={editor} />
            <TilePalette
              color={editor.color}
              tileColors={colors}
              ownLabel="Цвета модели"
              onColor={editor.chooseColor}
            />
          </>
        )}
        <Divider />
        <VoxelSizeControls editor={editor} />
        {confirmClose ? (
          <Stack gap="xs">
            <Text size="sm">
              Закрыть без сохранения? Правки модели пропадут.
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={props.onKeepEditing}>
                Править дальше
              </Button>
              <Button color="red" onClick={props.onDiscard}>
                Закрыть
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={props.onCancel}>
              Отмена
            </Button>
            <Button onClick={() => props.onDone(editor.result())}>
              Готово
            </Button>
          </Group>
        )}
      </Stack>
    </div>
  );
}

export default VoxelEditorBody;
