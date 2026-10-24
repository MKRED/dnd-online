import { Drawer } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { GameEvent } from 'shared';
import { GameJournalEntries } from '../../../features/games';

interface GameJournalProps {
  gameId: string;
  // Записи, пришедшие по сокету, старые первыми.
  live: GameEvent[];
  opened: boolean;
  onClose: () => void;
}

// Журнал игры у мастера — шторка справа: так же откроется и поверх 3D-сцены, не уводя с
// неё (docs/plan/done/game.md, этап 2). Новые записи приходят по сокету; «Обновить» — на
// случай обрыва связи.
function GameJournal({ gameId, live, opened, onClose }: GameJournalProps) {
  const narrow = useMediaQuery('(max-width: 36em)');
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={narrow ? '100%' : 'md'}
      title="Журнал игры"
      closeButtonProps={{ 'aria-label': 'Закрыть журнал' }}
    >
      {/* Закрытая шторка не держит содержимое: открытие монтирует его и грузит заново. */}
      <GameJournalEntries gameId={gameId} live={live} />
    </Drawer>
  );
}

export default GameJournal;
