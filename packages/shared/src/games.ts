import type { CharacterClassLevel, CharacterSpecies } from './character.js';
import type { GameSceneStatus } from './game-scenes.js';

// Игры (docs/plan/done/game.md): кампания мастера с местами для персонажей игроков.
// Место — персонаж в игре, а не человек онлайн; мастер места не занимает.
export const GAME_NAME_MAX = 100;
export const GAME_PASSWORD_MAX = 100;
// Обычная партия — 3–6 персонажей; восемь мест с запасом.
export const GAME_SEATS_MIN = 1;
export const GAME_SEATS_MAX = 8;
export const DEFAULT_GAME_SEATS = 4;

// Кем смотрящий приходится игре: мастер, игрок на месте, участник без места (вошёл в
// лобби) или никем. В закрытое лобби пускает пароль, введённый один раз.
export type GameRole = 'master' | 'player' | 'member' | null;

export interface GameUser {
  id: string;
  nickname: string;
}

export interface GameListItem {
  id: string;
  name: string;
  master: GameUser;
  seatCount: number;
  takenSeats: number;
  // Закрытая игра спрашивает пароль при входе в лобби.
  hasPassword: boolean;
  role: GameRole;
  // Начало идущей встречи; null — встреча не идёт. Начинает и заканчивает её мастер.
  sessionStartedAt: string | null;
  createdAt: string;
}

// Что лобби показывает о персонаже на месте — то, что видно за столом: имя, вид, классы.
// Лист целиком остаётся за доступом самого персонажа.
export interface GameSeatCharacter {
  id: string;
  name: string;
  species: CharacterSpecies;
  classes: CharacterClassLevel[];
}

export interface GameSeat {
  user: GameUser;
  character: GameSeatCharacter;
  // Владелец разрешил мастеру отдать управление персонажем другому игроку, когда его нет.
  allowHandover: boolean;
  // Кому мастер отдал управление (этап 7): он водит фигурку вместе с владельцем; null —
  // никому.
  controller: GameUser | null;
  seatedAt: string;
}

export interface GameDetail extends GameListItem {
  // По времени занятия места.
  seats: GameSeat[];
  // Активная сцена: мастеру — всегда, игроку — только открытая; null — сцены нет или
  // она закрыта от смотрящего.
  scene: GameSceneStatus | null;
  // Номер последней записи журнала на момент чтения: с него страница входит в комнату
  // сокета и догоняет то, что случилось между чтением и входом.
  eventSeq: number;
  // Участники игры (вошедшие в лобби, с местом и без) — только мастеру: из них он
  // выбирает управляющего. Остальным — пустой список.
  members: GameUser[];
}
