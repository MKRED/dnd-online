import { Button, Group, Kbd, Paper, Stack, Text } from '@mantine/core';
import type { SizedMapState } from 'shared';
import type { HoverStore } from '../../MapScene/hoverStore';
import type { MapEditor } from '../useMapEditor';
import { previewText } from './toolTexts';
import { useRegionPreview } from './useRegionPreview';

interface AnchorCardProps {
  editor: MapEditor;
  state: SizedMapState | null;
  hover: HoverStore | null;
}

// Начатая область (docs/plan/done/scene-page.md, этап 3): первый угол, у замены — что на что, и
// подсчёт до второго щелчка по клетке под курсором.
function AnchorCard({ editor, state, hover }: AnchorCardProps) {
  const preview = useRegionPreview(editor, state, hover);
  const { anchor, catalog } = editor;
  if (!anchor) return null;
  const label = (name: string) => catalog.describe(name)?.label ?? name;
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Text size="sm">
            Первый угол: <b>{anchor.cell.join(', ')}</b>
          </Text>
          <Button
            size="compact-xs"
            variant="default"
            onClick={editor.cancelRegion}
            rightSection={<Kbd size="xs">Esc</Kbd>}
          >
            Сбросить
          </Button>
        </Group>
        {editor.tool === 'replace' && anchor.match && (
          <Text size="sm">
            «{label(anchor.match)}» → «{label(editor.block)}»
          </Text>
        )}
        <Text size="sm" c={preview ? undefined : 'dimmed'}>
          {preview
            ? `Будет: ${previewText(editor.tool, preview)}`
            : 'Наведите на второй угол — здесь будет, сколько блоков изменится'}
        </Text>
      </Stack>
    </Paper>
  );
}

export default AnchorCard;
