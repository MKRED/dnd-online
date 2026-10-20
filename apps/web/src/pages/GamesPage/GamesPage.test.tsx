import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameListItem } from 'shared';
import { renderWithProviders } from '../../test/render';
import GamesPage from './GamesPage';

const GAME: GameListItem = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Подземелье',
  master: { id: 'm1', nickname: 'Мастер' },
  seatCount: 4,
  takenSeats: 2,
  hasPassword: true,
  role: 'master',
  sessionStartedAt: null,
  createdAt: '2026-10-20T00:00:00.000Z',
};

function stubFetch(responses: { status: number; body?: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GamesPage', () => {
  it('показывает игры: мастера, места, замок и роль', async () => {
    stubFetch([
      {
        status: 200,
        body: [
          GAME,
          { ...GAME, id: 'open', name: 'Лес', hasPassword: false, role: null },
        ],
      },
    ]);
    renderWithProviders(<GamesPage />, { route: '/games' });

    const locked = await screen.findByRole('link', {
      name: 'Открыть игру Подземелье',
    });
    expect(within(locked).getByLabelText('С паролем')).toBeInTheDocument();
    expect(within(locked).getByText('Вы мастер')).toBeInTheDocument();
    expect(within(locked).getByText('Места: 2 из 4')).toBeInTheDocument();
    const open = screen.getByRole('link', { name: 'Открыть игру Лес' });
    expect(within(open).queryByLabelText('С паролем')).not.toBeInTheDocument();
    expect(open).toHaveAttribute('href', '/games/open');
  });

  it('создаёт игру с паролем из окна', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: [] },
      { status: 201, body: { ...GAME, seats: [] } },
    ]);
    renderWithProviders(<GamesPage />, { route: '/games' });
    const user = userEvent.setup();

    expect(await screen.findByText(/Игр пока нет/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Создать игру' }));
    const dialog = await screen.findByRole('dialog', { name: 'Новая игра' });
    await user.type(within(dialog).getByLabelText(/Название/), 'Подземелье');
    await user.type(within(dialog).getByLabelText('Пароль'), 'секрет');
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const init = fetchMock.mock.calls[1][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Подземелье',
      seatCount: 4,
      password: 'секрет',
    });
  });
});
