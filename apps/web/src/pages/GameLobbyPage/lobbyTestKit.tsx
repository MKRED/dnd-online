import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { DEFAULT_USER_SETTINGS, type GameDetail } from 'shared';
import { renderWithProviders } from '../../test/render';
import GameLobbyPage from './GameLobbyPage';

// Общее для тестов лобби: игра, подмена сети и отрисовка страницы.
export const GAME: GameDetail = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Подземелье',
  master: { id: 'm1', nickname: 'Мастер' },
  seatCount: 3,
  takenSeats: 1,
  hasPassword: true,
  role: 'member',
  sessionStartedAt: null,
  createdAt: '2026-10-20T00:00:00.000Z',
  seats: [
    {
      user: { id: 'u2', nickname: 'Аня' },
      character: {
        id: 'c2',
        name: 'Лира',
        species: 'elf',
        classes: [{ class: 'rogue', level: 3 }],
      },
      allowHandover: false,
      seatedAt: '2026-10-20T00:00:00.000Z',
    },
  ],
  scene: null,
};

export function stubFetch(responses: { status: number; body?: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderLobby(userId = 'u1') {
  return renderWithProviders(
    <Routes>
      <Route path="/games/:id" element={<GameLobbyPage />} />
    </Routes>,
    {
      route: `/games/${GAME.id}`,
      auth: {
        user: {
          id: userId,
          login: 'me',
          nickname: 'Я',
          settings: DEFAULT_USER_SETTINGS,
        },
      },
    },
  );
}

export function body(call: unknown[]) {
  return JSON.parse((call[1] as RequestInit).body as string) as unknown;
}
