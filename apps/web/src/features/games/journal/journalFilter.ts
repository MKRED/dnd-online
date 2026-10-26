import { gameEventGroup, type GameEvent, type GameEventGroup } from 'shared';
import { dividerTitle } from './gameEventText';

export type JournalFilter = GameEventGroup | 'all';

interface JournalFilterOptions {
  filter: JournalFilter;
  // «Глазами игроков»: только записи с видимостью players.
  players: boolean;
  // Раунды, начало и конец боя — разделители (вкладка «Журнал» на сцене).
  rounds: boolean;
}

// Записи журнала под фильтром группы и «Глазами игроков». Разделители раундов
// остаются: по ним ищут, когда это было. Но под фильтром раунды без своих записей
// слиплись бы в столбик разделителей — оставляем разделитель, только если над ним
// (новее) запись его раунда или он самый верхний, текущий.
export function filterJournal(
  events: readonly GameEvent[],
  { filter, players, rounds }: JournalFilterOptions,
): GameEvent[] {
  const divider = (event: GameEvent) => rounds && dividerTitle(event) !== null;
  const kept = events.filter(
    (event) =>
      divider(event) ||
      ((!players || event.visibility === 'players') &&
        (filter === 'all' || gameEventGroup(event) === filter)),
  );
  if (filter === 'all' && !players) return kept;
  return kept.filter(
    (event, index) =>
      !divider(event) || index === 0 || !divider(kept[index - 1]),
  );
}
