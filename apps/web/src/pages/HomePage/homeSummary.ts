import type { Character, GameDetail, GameListItem } from 'shared';
import { CLASS_LABELS } from '../../features/characters';

// Сколько строк и плиток главная показывает в каждом блоке; остальное — по ссылке «Все».
export const HOME_LIMITS = {
  myGames: 5,
  joinable: 5,
  bookmarks: 8,
  maps: 5,
} as const;

// Состояние игры для метки в «Мои игры»: встреча идёт, места ещё свободны (собирается
// лобби) или все сели и встречи сейчас нет.
export type HomeGameStatus = 'session' | 'lobby' | 'idle';

export function homeGameStatus(
  game: Pick<GameListItem, 'sessionStartedAt' | 'seatCount' | 'takenSeats'>,
): HomeGameStatus {
  if (game.sessionStartedAt) return 'session';
  return game.takenSeats < game.seatCount ? 'lobby' : 'idle';
}

// Свои игры — где смотрящий мастер или сидит персонажем. Просто вошедший в лобби
// ещё не играет: такая игра остаётся в «Можно сесть».
export function myGames(games: GameListItem[]): GameListItem[] {
  return games.filter((g) => g.role === 'master' || g.role === 'player');
}

// Игры с идущей встречей — для карточки «Сейчас идёт», свежие сверху.
export function runningGames(games: GameListItem[]): GameListItem[] {
  return myGames(games)
    .filter((g) => g.sessionStartedAt)
    .sort((a, b) => b.sessionStartedAt!.localeCompare(a.sessionStartedAt!));
}

// «Можно сесть»: чужие открытые игры (без пароля) со свободными местами.
export function joinableGames(games: GameListItem[]): GameListItem[] {
  return games.filter(
    (g) =>
      (g.role === null || g.role === 'member') &&
      !g.hasPassword &&
      g.takenSeats < g.seatCount,
  );
}

// Приветствие по времени суток смотрящего.
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 17) return 'Добрый день';
  if (hour >= 17 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

// Длительность встречи: «45 мин», «1 ч 20 мин».
export function sessionDuration(startedAt: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(startedAt)) / 60_000),
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

// Одна строка под приветствием: что сейчас происходит в своих играх.
export function summaryLine(games: GameListItem[]): string {
  const running = runningGames(games);
  if (running.length === 1) return `Идёт встреча в «${running[0].name}».`;
  if (running.length > 1) return `Идут встречи: ${running.length}.`;
  if (myGames(games).length > 0) return 'Сейчас встреч нет.';
  return 'Своих игр пока нет: сядьте в открытую или создайте новую.';
}

// Классы с уровнями: «Паладин 3», «Воин 2 / Плут 1».
export function classesLabel(character: Pick<Character, 'classes'>): string {
  return character.classes
    .map((c) => `${CLASS_LABELS[c.class]} ${c.level}`)
    .join(' / ');
}

// В какой из своих игр сидит каждый персонаж: id персонажа → название игры. Места видны
// только в подробностях игры, поэтому — по загруженным GameDetail.
export function seatedIn(details: GameDetail[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const game of details) {
    for (const seat of game.seats) result.set(seat.character.id, game.name);
  }
  return result;
}

// Игровые персонажи впереди НПС, внутри — как пришли из API.
export function charactersForStrip(characters: Character[]): Character[] {
  return [
    ...characters.filter((c) => c.kind === 'pc'),
    ...characters.filter((c) => c.kind !== 'pc'),
  ];
}
