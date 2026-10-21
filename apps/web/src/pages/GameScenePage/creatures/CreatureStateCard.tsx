import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import type {
  GameCreatureChange,
  GameCreatureState,
  GameCreatures,
} from 'shared';
import { EffectLinksStrip } from '../../../features/characters';
import {
  changeGameCreature,
  gameCreatureEffectsBase,
} from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';
import HitPointsControls from './HitPointsControls';
import classes from './creatures.module.css';

interface CreatureStateCardProps {
  gameId: string;
  objectId: number;
  state: GameCreatureState;
  // Ответ правки хитов — существа сцены целиком.
  onChanged: (creatures: GameCreatures) => void;
  // Эффекты сменились — перечитать существа.
  onEffects: () => void;
  onOpenSheet: () => void;
}

// Карточка монстра или НПС у мастера (docs/plan/done/game.md, этап 8): хиты экземпляра и
// эффекты, наложенные в игре. Свойства вида — в стат-блоке («Полный лист»).
function CreatureStateCard({
  gameId,
  objectId,
  state,
  onChanged,
  onEffects,
  onOpenSheet,
}: CreatureStateCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = async (next: GameCreatureChange) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await changeGameCreature(gameId, objectId, next));
    } catch (err: unknown) {
      console.error('Scene creature change failed', err);
      setError(errorMessage(err, 'Не удалось изменить существо'));
    } finally {
      setBusy(false);
    }
  };
  const { hitPoints } = state;

  return (
    <Stack
      gap="xs"
      className={classes.card}
      aria-label={`Карточка: ${state.name}`}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} truncate>
          {state.name}
        </Text>
        <Button size="compact-xs" variant="subtle" onClick={onOpenSheet}>
          Полный лист
        </Button>
      </Group>
      <HitPointsControls
        current={hitPoints.current}
        max={hitPoints.max}
        temp={hitPoints.temp}
        busy={busy}
        onChange={(next) => void change(next)}
      />
      <EffectLinksStrip
        effects={state.effects}
        apiBase={gameCreatureEffectsBase(gameId, objectId)}
        owner="monster"
        onChange={onEffects}
      />
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}

export default CreatureStateCard;
