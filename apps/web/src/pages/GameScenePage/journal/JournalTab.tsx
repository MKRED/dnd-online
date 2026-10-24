import { GameJournalEntries } from '../../../features/games';
import type { JournalLive } from './useJournalLive';

// Вкладка «Журнал» у мастера на сцене (docs/plan/scene-page.md, этап 7, вариант Б без
// фильтров): записи как в шторке лобби, раунды разделены записью «Новый раунд».
// Вкладка монтируется при открытии — открытие и есть обновление, как у шторки.
function JournalTab({
  gameId,
  journal,
}: {
  gameId: string;
  journal: JournalLive;
}) {
  return (
    <GameJournalEntries
      key={journal.key}
      gameId={gameId}
      live={journal.live}
      rounds
    />
  );
}

export default JournalTab;
