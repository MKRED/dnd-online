import { Group, Stack, Text } from '@mantine/core';
import { SHAPE_LABELS, SHAPE_NAMES, type BlockGroupFields } from 'shared';
import { ShapeSwatch } from '../../maps';

interface BlockShapesProps {
  group: Pick<BlockGroupFields, 'look' | 'color' | 'textures'>;
}

// Картинка группы блоков — сами блоки: большой куб и под ним все формы группы
// (docs/plan/blocks.md, этап 4). Отдельная картинка записи блоку не нужна: его узнают
// по виду, как в окне выбора блока.
function BlockShapes({ group }: BlockShapesProps) {
  return (
    <Stack gap="sm" align="center">
      <ShapeSwatch
        material={group.look}
        color={group.color}
        textures={group.textures}
        shape="cube"
        size={160}
      />
      <Group gap={4} justify="center" role="list" aria-label="Формы группы">
        {SHAPE_NAMES.map((shape) => (
          <Stack key={shape} gap={2} align="center" w={52} role="listitem">
            <ShapeSwatch
              material={group.look}
              color={group.color}
              textures={group.textures}
              shape={shape}
              size={40}
            />
            <Text size="xs" c="dimmed" ta="center" lh={1.2}>
              {SHAPE_LABELS[shape]}
            </Text>
          </Stack>
        ))}
      </Group>
    </Stack>
  );
}

export default BlockShapes;
