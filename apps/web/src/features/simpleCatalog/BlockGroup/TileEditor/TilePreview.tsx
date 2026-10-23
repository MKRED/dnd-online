import { Group, Stack, Text } from '@mantine/core';
import type { BlockTextures, MaterialName } from 'shared';
import { ownTileImage, ShapeSwatch } from '../../../maps';
import classes from './TileEditor.module.css';

interface TilePreviewProps {
  tile: string;
  // Текстуры блока с правленой плиткой на её грани — для куба.
  textures: BlockTextures;
  look: MaterialName;
  color: string;
}

// Предпросмотр: плитка 3×3 (видно швы на стыках) и куб, как на карте.
function TilePreview({ tile, textures, look, color }: TilePreviewProps) {
  return (
    <Group gap="md" align="flex-end">
      <Stack gap={4} align="center">
        <div
          className={classes.tiled}
          role="img"
          aria-label="Плитка 3×3"
          style={{ backgroundImage: `url(${ownTileImage(tile)})` }}
        />
        <Text size="xs" c="dimmed">
          3×3
        </Text>
      </Stack>
      <Stack gap={4} align="center">
        <ShapeSwatch
          material={look}
          color={color}
          textures={textures}
          shape="cube"
          size={120}
        />
        <Text size="xs" c="dimmed">
          Куб
        </Text>
      </Stack>
    </Group>
  );
}

export default TilePreview;
