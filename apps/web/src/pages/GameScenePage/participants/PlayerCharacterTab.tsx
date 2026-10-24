import { Button, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconWalk } from '@tabler/icons-react';
import { useState } from 'react';
import type { GameFigure } from 'shared';
import { figureImagePath } from '../../../features/games';
import type { CardTarget } from '../cardWindows';
import CharacterStateCard from '../creatures/CharacterStateCard';
import MovementRow from '../creatures/MovementRow';
import type { FigureTool } from '../figures';
import Portrait from './Portrait';

interface PlayerCharacterTabProps {
  gameId: string;
  // Свои фигурки и те, кем игрок управляет (canMove).
  own: readonly GameFigure[];
  version: number;
  tool: FigureTool;
  onOpenCard: (target: CardTarget) => void;
}

// Вкладка «Персонаж» у игрока (docs/plan/scene-page.md, этап 5, вариант А): свой персонаж
// крупно — хиты с правкой, спасброски, ячейки, эффекты, запас и «Ходить». Если игрок ведёт
// нескольких — переключатель имён сверху.
function PlayerCharacterTab({
  gameId,
  own,
  version,
  tool,
  onOpenCard,
}: PlayerCharacterTabProps) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  if (own.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="xs">
        Вашего персонажа нет на сцене. Мастер поставит его на свободную клетку —
        он появится здесь.
      </Text>
    );
  }
  // Выбранная на сцене своя фигурка показывается сама: щелчок по ней — тот же выбор.
  const figure =
    own.find((f) => f.character.id === tool.selectedId) ??
    own.find((f) => f.character.id === chosenId) ??
    own[0];
  const id = figure.character.id;
  const walking = tool.selectedId === id;
  return (
    <Stack gap="sm">
      {own.length > 1 && (
        <SegmentedControl
          aria-label="Чей персонаж"
          size="xs"
          fullWidth
          value={id}
          onChange={setChosenId}
          data={own.map((f) => ({
            value: f.character.id,
            label: f.character.name,
          }))}
        />
      )}
      <Group gap="sm" wrap="nowrap">
        <Portrait
          image={figureImagePath(gameId, figure)}
          name={figure.character.name}
          kind="pc"
          size={44}
        />
        <Text fw={700} size="lg" style={{ flex: 1, minWidth: 0 }} truncate>
          {figure.character.name}
        </Text>
        <Button
          size="xs"
          variant="default"
          onClick={() => onOpenCard({ kind: 'character', id })}
        >
          Карточка
        </Button>
      </Group>
      <CharacterStateCard
        key={id}
        gameId={gameId}
        characterId={id}
        version={version}
        onOpenSheet={() => onOpenCard({ kind: 'character', id })}
        bare
      />
      <MovementRow
        name={figure.character.name}
        movement={figure}
        busy={tool.busy}
      />
      <Button
        variant={walking ? 'filled' : 'light'}
        leftSection={<IconWalk size={16} />}
        aria-pressed={walking}
        onClick={() => tool.select(walking ? null : id)}
      >
        {walking ? 'Идёт: щёлкните подсвеченную клетку' : 'Ходить'}
      </Button>
    </Stack>
  );
}

export default PlayerCharacterTab;
