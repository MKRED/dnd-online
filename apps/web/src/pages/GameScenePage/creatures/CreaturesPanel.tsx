import { Stack, Text, UnstyledButton } from '@mantine/core';
import { creatureHealthLabel, type GameCreature } from 'shared';
import classes from './creatures.module.css';

interface CreaturesPanelProps {
  creatures: readonly GameCreature[];
  selectedId: number | null;
  onSelect: (objectId: number | null) => void;
}

// Монстры и НПС сцены у мастера (docs/plan/game.md, этап 8): хиты и метка здоровья;
// щелчок выбирает существо — его карточка ниже. Выбрать можно и щелчком по нему на карте.
function CreaturesPanel({
  creatures,
  selectedId,
  onSelect,
}: CreaturesPanelProps) {
  const shown = creatures.filter((creature) => creature.state);
  if (shown.length === 0) return null;
  return (
    <Stack gap={4}>
      <Text fw={600} size="sm">
        Существа
      </Text>
      {shown.map(({ objectId, state, health }) => (
        <UnstyledButton
          key={objectId}
          className={classes.row}
          data-selected={selectedId === objectId || undefined}
          aria-pressed={selectedId === objectId}
          onClick={() => onSelect(selectedId === objectId ? null : objectId)}
        >
          <Text size="sm" truncate>
            {state!.name}
          </Text>
          <Text size="xs" c="dimmed">
            ХП {state!.hitPoints.current} / {state!.hitPoints.max}
            {health && ` · ${creatureHealthLabel(health, false)}`}
          </Text>
        </UnstyledButton>
      ))}
    </Stack>
  );
}

export default CreaturesPanel;
