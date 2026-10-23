import { Group, Paper, Stack, Text } from '@mantine/core';
import { insideMap, type SizedMapState } from 'shared';
import type { HoverStore } from '../../MapScene/hoverStore';
import { cursorBlock } from '../cursorBlock';
import { useHoverCell } from './useRegionPreview';

interface CursorBlockCardProps {
  state: SizedMapState | null;
  hover: HoverStore | null;
}

// «Под курсором» в «Просмотре» (docs/plan/scene-page.md, этап 3): блок, клетка, форма и
// свойства для правил.
function CursorBlockCard({ state, hover }: CursorBlockCardProps) {
  const cell = useHoverCell(hover);
  const block =
    state && cell && insideMap(cell, state.size)
      ? cursorBlock(state, cell)
      : null;
  return (
    <Stack gap={6}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Под курсором
      </Text>
      <Paper withBorder radius="md" p="sm">
        {!block ? (
          <Text size="sm" c="dimmed">
            Наведите курсор на блок
          </Text>
        ) : (
          <Stack gap={4}>
            <Group gap="sm" wrap="nowrap">
              {block.color && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    flex: 'none',
                    borderRadius: 6,
                    background: block.color,
                  }}
                />
              )}
              <div>
                <Text size="sm" fw={600}>
                  {block.label ?? 'Пусто'}
                </Text>
                <Text size="xs" c="dimmed">
                  клетка {block.cell.join(', ')}
                  {block.shape && ` · ${block.shape.toLowerCase()}`}
                </Text>
              </div>
            </Group>
            {block.traits.length > 0 && (
              <Text size="xs" c="dimmed">
                {block.traits.join(' · ')}
              </Text>
            )}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

export default CursorBlockCard;
