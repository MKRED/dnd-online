import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS, type GameDetail } from 'shared';
import { sampleCharacter } from '../../test/characterFixture';
import { renderWithProviders } from '../../test/render';
import GameLobbyPage from './GameLobbyPage';

const GAME: GameDetail = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Подземелье',
  master: { id: 'm1', nickname: 'Мастер' },
  seatCount: 3,
  takenSeats: 1,
  hasPassword: true,
  role: 'member',
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

function renderLobby(userId = 'u1') {
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

function body(call: unknown[]) {
  return JSON.parse((call[1] as RequestInit).body as string) as unknown;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GameLobbyPage', () => {
  it('закрытое лобби спрашивает пароль и после него показывает места', async () => {
    const fetchMock = stubFetch([
      {
        status: 403,
        body: { statusCode: 403, message: 'Игра закрыта паролем' },
      },
      { status: 200, body: GAME },
    ]);
    renderLobby();
    const user = userEvent.setup();

    expect(await screen.findByText('Игра закрыта паролем')).toBeInTheDocument();
    expect(screen.queryByText('Лира')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Пароль игры'), 'секрет');
    await user.click(screen.getByRole('button', { name: 'Войти в лобби' }));

    expect(await screen.findByText('Лира')).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/games\/.+\/enter$/);
    expect(body(fetchMock.mock.calls[1])).toEqual({ password: 'секрет' });
    expect(screen.getByText('Игрок: Аня')).toBeInTheDocument();
    expect(screen.getByText('Управление не передаётся')).toBeInTheDocument();
    // Одно место занято, два свободны — каждое можно занять.
    expect(screen.getAllByText('Свободное место')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Занять' })).toHaveLength(2);
  });

  it('игрок занимает место своим игровым персонажем', async () => {
    const npc = {
      ...sampleCharacter,
      id: 'npc',
      name: 'Трактирщик',
      kind: 'npc',
    };
    const seated: GameDetail = {
      ...GAME,
      role: 'player',
      takenSeats: 2,
      seats: [
        ...GAME.seats,
        {
          user: { id: 'u1', nickname: 'Я' },
          character: {
            id: sampleCharacter.id,
            name: sampleCharacter.name,
            species: sampleCharacter.species,
            classes: sampleCharacter.classes,
          },
          allowHandover: true,
          seatedAt: '2026-10-20T01:00:00.000Z',
        },
      ],
    };
    const fetchMock = stubFetch([
      { status: 200, body: GAME },
      { status: 200, body: [sampleCharacter, npc] },
      { status: 201, body: seated },
    ]);
    renderLobby();
    const user = userEvent.setup();

    await user.click(
      (await screen.findAllByRole('button', { name: 'Занять' }))[0],
    );
    const dialog = await screen.findByRole('dialog', { name: 'Занять место' });
    // Единственный игровой персонаж выбран сразу, НПС в списке нет.
    await user.click(within(dialog).getByRole('button', { name: 'Занять' }));

    expect(await screen.findByText('Вы играете')).toBeInTheDocument();
    expect(body(fetchMock.mock.calls[2])).toEqual({
      characterId: sampleCharacter.id,
      allowHandover: true,
    });
    expect(
      screen.getByRole('switch', { name: 'Можно передать управление' }),
    ).toBeChecked();
    expect(
      screen.queryByRole('button', { name: 'Занять' }),
    ).not.toBeInTheDocument();
  });

  it('мастер видит «Убрать из игры» и «Удалить игру», занять место не может', async () => {
    stubFetch([{ status: 200, body: { ...GAME, role: 'master' } }]);
    renderLobby('m1');

    expect(
      await screen.findByRole('button', { name: 'Убрать из игры' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Удалить игру' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Занять' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Выйти из игры' }),
    ).not.toBeInTheDocument();
  });
});
