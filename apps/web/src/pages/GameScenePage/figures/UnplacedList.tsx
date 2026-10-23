import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import type { GameEventCharacter } from 'shared';
import type { FigureTool } from './useFigureTool';

interface UnplacedListProps {
  unplaced: readonly GameEventCharacter[];
  tool: FigureTool;
}

// «Не на сцене» в «Правке» мастера (docs/plan/scene-page.md, этап 1): персонажи на местах,
// которым не хватило стартовой точки. «Поставить» выбирает персонажа, щелчок по клетке
// ставит его.
function UnplacedList({ unplaced, tool }: UnplacedListProps) {
  if (unplaced.length === 0) return null;
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Не на сцене
      </Text>
      {unplaced.map((character) => (
        <Group key={character.id} justify="space-between" wrap="nowrap">
          <Text size="sm" truncate>
            {character.name}
          </Text>
          <Button
            size="compact-xs"
            variant={tool.selectedId === character.id ? 'filled' : 'light'}
            // Своё имя у кнопки: «Поставить» — ещё и инструмент редактора сцены.
            aria-label={`Поставить на сцену: ${character.name}`}
            onClick={() =>
              tool.select(
                tool.selectedId === character.id ? null : character.id,
              )
            }
          >
            Поставить
          </Button>
        </Group>
      ))}
      {tool.error && <Alert color="red">{tool.error}</Alert>}
    </Stack>
  );
}

export default UnplacedList;
