import type { GameListItem, GameRole } from 'shared';

export function seatsLabel(
  game: Pick<GameListItem, 'seatCount' | 'takenSeats'>,
) {
  return `Места: ${game.takenSeats} из ${game.seatCount}`;
}

// Метка роли смотрящего у игры в списке и в лобби.
export const ROLE_LABELS: Record<Exclude<GameRole, null>, string> = {
  master: 'Вы мастер',
  player: 'Вы играете',
  member: 'Вы в лобби',
};
