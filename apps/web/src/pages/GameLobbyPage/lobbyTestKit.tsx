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
  eventSeq: 1,
};

export function stubFetch(responses: { status: number; body?: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  }
  // Блок сцен мастера читает себя сам; тесты, которые не о сценах, его запрос не ждут —
  // он не занимает очередь ответов и не попадает в fetchMock.mock.calls.
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    urlOf(input).endsWith('/scenes') && !init?.method
      ? Promise.resolve(
          new Response(JSON.stringify({ open: false, scenes: [] }), {
            status: 200,
          }),
        )
      : fetchMock(input, init),
  );
  return fetchMock;
}

export function renderLobby(userId = 'u1') {
  return renderWithProviders(
    <Routes>
      <Route path="/games/:id" element={<GameLobbyPage />} />
      <Route path="/games/:id/scene" element={<p>Страница сцены</p>} />
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

// Подмена сети по адресу и методу — когда порядок запросов зависит от перечитываний.
export function routeFetch(
  routes: Record<
    string,
    (init?: RequestInit) => { status: number; body?: unknown }
  >,
) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const url = urlOf(input);
    const path = url.replace(/^.*\/api/, '');
    const key = `${init?.method ?? 'GET'} ${path}`;
    const route = routes[key];
    if (!route) return Promise.reject(new Error(`Нет ответа для ${key}`));
    const { status, body } = route(init);
    return Promise.resolve(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// Адрес запроса из аргумента fetch.
export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
