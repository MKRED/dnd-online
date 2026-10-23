import { Button, Group, Stack, Text } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import type { BlockTextures } from 'shared';
import {
  tileFromBase64,
  tileToBase64,
  useKeyCodes,
  type Tile,
} from '../../../maps';
import { withUploadedTile } from '../blockTextureForm';
import { PIXEL_PALETTE } from './pixelPalette';
import TileCanvas from './TileCanvas';
import classes from './TileEditor.module.css';
import type { TileEditorModalProps, TileEditorTarget } from './TileEditorModal';
import TilePalette from './TilePalette';
import TilePreview from './TilePreview';
import TileToolbar from './TileToolbar';
import { TILE_TOOLS } from './tileTools';
import { tileColors } from './tilePixels';
import { useTileEditor } from './useTileEditor';

interface TileEditorBodyProps extends Omit<TileEditorModalProps, 'onClose'> {
  target: TileEditorTarget;
  textures: BlockTextures;
  confirmClose: boolean;
  onDirty: (dirty: boolean) => void;
  onKeepDrawing: () => void;
  onCancel: () => void;
  onDiscard: () => void;
}

// Содержимое окна редактора: монтируется заново на каждое открытие, поэтому плитка,
// история и инструмент всегда начинаются с текущей плитки формы.
function TileEditorBody(props: TileEditorBodyProps) {
  const { target, textures, look, color, confirmClose } = props;
  const [initial] = useState<Tile>(() => tileFromBase64(textures[target.face]));
  const editor = useTileEditor(
    initial,
    tileColors(initial, 1)[0] ?? PIXEL_PALETTE[0].colors[2],
  );
  const { onDirty } = props;
  useEffect(() => onDirty(editor.dirty), [onDirty, editor.dirty]);

  useKeyCodes(
    Object.fromEntries(
      TILE_TOOLS.map(({ code, tool }) => [code, () => editor.setTool(tool)]),
    ),
  );
  useHotkeys([
    ['mod+Z', editor.undo],
    ['mod+shift+Z', editor.redo],
    ['mod+Y', editor.redo],
  ]);

  const tile = tileToBase64(editor.tile);
  const previewTextures = withUploadedTile(
    target.mode,
    textures,
    target.face,
    tile,
  );

  return (
    <Stack gap="md">
      <div className={classes.layout}>
        <TileCanvas
          tile={editor.tile}
          onDown={editor.down}
          onMove={editor.move}
          onUp={editor.up}
        />
        <Stack gap="md">
          <TileToolbar
            tool={editor.tool}
            onTool={editor.setTool}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
          />
          <TilePalette
            color={editor.color}
            tileColors={tileColors(editor.tile, 12)}
            onColor={editor.chooseColor}
          />
          <TilePreview
            tile={tile}
            textures={previewTextures}
            look={look}
            color={color}
          />
        </Stack>
      </div>
      {confirmClose ? (
        <Group justify="flex-end" gap="xs">
          <Text size="sm" mr="auto">
            Закрыть без сохранения? Нарисованное пропадёт.
          </Text>
          <Button variant="default" onClick={props.onKeepDrawing}>
            Рисовать дальше
          </Button>
          <Button color="red" onClick={props.onDiscard}>
            Закрыть
          </Button>
        </Group>
      ) : (
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={props.onCancel}>
            Отмена
          </Button>
          <Button onClick={() => props.onDone(target.face, tile)}>
            Готово
          </Button>
        </Group>
      )}
    </Stack>
  );
}

export default TileEditorBody;
