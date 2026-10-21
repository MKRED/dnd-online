import { Stack } from '@mantine/core';
import type { GameFigure } from 'shared';
import CharacterStateCard from './CharacterStateCard';
import CreaturesPanel from './CreaturesPanel';
import CreatureStateCard from './CreatureStateCard';
import FullSheetDrawer from './FullSheetDrawer';
import type { useCreatureCards } from './useCreatureCards';

interface CreatureCardsProps {
  gameId: string;
  master: boolean;
  cards: ReturnType<typeof useCreatureCards>;
  // Выбранная фигурка, которую смотрящий ведёт: её карточка.
  figure: GameFigure | null;
}

// Состояние существ в боковой панели сцены (docs/plan/game.md, этап 8): у мастера —
// список монстров и НПС; карточка выбранной фигурки или существа; полный лист в шторке.
function CreatureCards({ gameId, master, cards, figure }: CreatureCardsProps) {
  const creature = !figure && cards.selected?.state ? cards.selected : null;
  return (
    <Stack gap="sm">
      {master && cards.creatures.creatures && (
        <CreaturesPanel
          creatures={cards.creatures.creatures.creatures}
          selectedId={figure ? null : (cards.selected?.objectId ?? null)}
          onSelect={cards.select}
        />
      )}
      {figure?.canMove && (
        <CharacterStateCard
          key={figure.character.id}
          gameId={gameId}
          characterId={figure.character.id}
          version={cards.version}
          onOpenSheet={() =>
            cards.setSheet({ kind: 'character', id: figure.character.id })
          }
        />
      )}
      {creature?.state && (
        <CreatureStateCard
          gameId={gameId}
          objectId={creature.objectId}
          state={creature.state}
          onChanged={cards.creatures.apply}
          onEffects={cards.creatures.reload}
          onOpenSheet={() => cards.openCreatureSheet(creature.objectId)}
        />
      )}
      <FullSheetDrawer
        gameId={gameId}
        target={cards.sheet}
        onClose={() => cards.setSheet(null)}
      />
    </Stack>
  );
}

export default CreatureCards;
