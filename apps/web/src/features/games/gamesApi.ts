import type { GameDetail, GameEventPage, GameListItem } from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

export interface CreateGamePayload {
  name: string;
  seatCount: number;
  // Пустой — игра открытая.
  password?: string;
}

export function listGames(): Promise<GameListItem[]> {
  return request('/games');
}

export function createGame(payload: CreateGamePayload): Promise<GameDetail> {
  return request('/games', { method: 'POST', body: JSON.stringify(payload) });
}

// Закрытое лобби без входа отвечает 403 — страница спрашивает пароль.
export function getGame(id: string): Promise<GameDetail> {
  return request(`/games/${id}`);
}

export function enterGame(id: string, password: string): Promise<GameDetail> {
  return request(`/games/${id}/enter`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function deleteGame(id: string): Promise<void> {
  return request(`/games/${id}`, { method: 'DELETE' });
}

export function takeSeat(
  id: string,
  characterId: string,
  allowHandover: boolean,
): Promise<GameDetail> {
  return request(`/games/${id}/seats`, {
    method: 'POST',
    body: JSON.stringify({ characterId, allowHandover }),
  });
}

export function updateSeat(
  id: string,
  allowHandover: boolean,
): Promise<GameDetail> {
  return request(`/games/${id}/seats/me`, {
    method: 'PATCH',
    body: JSON.stringify({ allowHandover }),
  });
}

// Встречу начинает и заканчивает мастер; пока она идёт, листы на местах закрыты.
export function startSession(id: string): Promise<GameDetail> {
  return request(`/games/${id}/session`, { method: 'POST' });
}

export function endSession(id: string): Promise<GameDetail> {
  return request(`/games/${id}/session`, { method: 'DELETE' });
}

export function freeSeat(id: string): Promise<GameDetail> {
  return request(`/games/${id}/seats/me`, { method: 'DELETE' });
}

// Себя — выйти из игры, другого — убрать (мастер).
export function removeMember(id: string, userId: string): Promise<void> {
  return request(`/games/${id}/members/${userId}`, { method: 'DELETE' });
}

// Журнал игры, новые сверху; только мастеру. before — номер записи, старше которой
// нужна следующая страница.
export function listGameEvents(
  id: string,
  before?: number,
): Promise<GameEventPage> {
  const query = before === undefined ? '' : `?before=${before}`;
  return request(`/games/${id}/events${query}`);
}
