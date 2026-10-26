import { Stack } from '@mantine/core';
import type { GameFigure } from 'shared';
import CharacterStateCard from './CharacterStateCard';
import CreatureStateCard from './CreatureStateCard';
import MovementRow from './MovementRow';
import type { CardTarget } from '../cardWindows/useCardWindows';
import type { useCreatureCards } from './useCreatureCards';

interface CreatureCardsProps {
  gameId: string;
  master: boolean;
  cards: ReturnType<typeof useCreatureCards>;
  // Выбранная фигурка, которую смотрящий ведёт: её карточка.
  figure: GameFigure | null;
  // Запас фигурки у мастера: обновить или «Рывок».
  onFigureAllowance: (characterId: string, change: 'refresh' | 'dash') => void;
  figureBusy: boolean;
  // «Карточка» — окно с листом (docs/plan/done/scene-page.md, этап 4).
  onOpenCard: (target: CardTarget) => void;
}

// Состояние выбранного во вкладке «Участники» (docs/plan/done/game.md, этап 8; вид —
// docs/plan/done/scene-page.md, этап 2): карточка выбранной фигурки или существа с запасом
// движения. «Карточка» открывает окно с листом (cardWindows).
function CreatureCards({
  gameId,
  master,
  cards,
  figure,
  onFigureAllowance,
  figureBusy,
  onOpenCard,
}: CreatureCardsProps) {
  const creature = !figure && cards.selected?.state ? cards.selected : null;
  if (figure?.canMove) {
    const id = figure.character.id;
    return (
      <Stack gap="xs">
        <CharacterStateCard
          key={id}
          gameId={gameId}
          characterId={id}
          version={cards.version}
          onOpenSheet={() => onOpenCard({ kind: 'character', id })}
        />
        <MovementRow
          name={figure.character.name}
          movement={figure}
          onAllowance={
            master ? (change) => onFigureAllowance(id, change) : undefined
          }
          busy={figureBusy}
        />
      </Stack>
    );
  }
  if (creature?.state) {
    const { objectId, state } = creature;
    return (
      <Stack gap="xs">
        <CreatureStateCard
          gameId={gameId}
          objectId={objectId}
          state={state}
          onChanged={cards.creatures.apply}
          onEffects={cards.creatures.reload}
          onOpenSheet={() => onOpenCard({ kind: 'creature', objectId })}
        />
        {creature.health !== 'down' && creature.health !== 'dead' && (
          <MovementRow
            name={state.name}
            movement={state.movement}
            onAllowance={(change) => cards.walk.allowance(objectId, change)}
            busy={cards.walk.busy}
          />
        )}
      </Stack>
    );
  }
  return null;
}

export default CreatureCards;
