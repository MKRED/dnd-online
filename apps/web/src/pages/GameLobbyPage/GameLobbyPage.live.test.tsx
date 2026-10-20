import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_SOCKET, type GameEvent } from 'shared';
import { createFakeGameSocket } from '../../test/fakeGameSocket';
import { GAME, renderLobby, stubFetch } from './lobbyTestKit';

// Лобби на сокете: присутствие, перечитывание по изменениям, закрытая комната и живой
// журнал мастера. Сокет поддельный — тест сам «присылает» сообщения сервера.
const socket = vi.hoisted(() => ({
  current: null as ReturnType<typeof createFakeGameSocket> | null,
}));
vi.mock('../../features/games/gameSocket', () => ({
  acquireGameSocket: () => socket.current,
  releaseGameSocket: () => undefined,
}));

function fake() {
  if (!socket.current) throw new Error('Сокет не создан');
  return socket.current;
}

const entered = (seq: number, nickname: string): GameEvent => ({
  seq,
  kind: 'member.entered',
  actor: { id: `u${seq}`, nickname },
  as: null,
  sceneId: null,
  intent: null,
  result: null,
  createdAt: '2026-10-20T10:00:00.000Z',
});

beforeEach(() => {
  socket.current = createFakeGameSocket();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GameLobbyPage: живое лобби', () => {
  it('входит в комнату игры и показывает, кто сейчас в лобби', async () => {
    fake().joinAck = { ok: true, seq: 1, online: ['m1'], missed: null };
    stubFetch([{ status: 200, body: GAME }]);
    renderLobby();

    await screen.findByText('Лира');
    // Входит с номера журнала, на котором прочитала лобби.
    expect(fake().emitWithAck).toHaveBeenCalledWith(GAME_SOCKET.join, {
      gameId: GAME.id,
      afterSeq: GAME.eventSeq,
    });
    // Мастер в сети, Аня (место Лиры) — нет.
    const dots = await screen.findAllByRole('img', { name: /лобби/ });
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'В лобби',
      'Не в лобби',
    ]);

    act(() =>
      fake().receive(GAME_SOCKET.presence, {
        gameId: GAME.id,
        online: ['m1', 'u2'],
      }),
    );
    expect(screen.getAllByRole('img', { name: 'В лобби' })).toHaveLength(2);
  });

  it('изменения между чтением лобби и входом в комнату не теряются', async () => {
    // Пока лобби грузилось, игрок занял место: журнал ушёл вперёд.
    fake().joinAck = { ok: true, seq: 2, online: [], missed: null };
    stubFetch([
      { status: 200, body: GAME },
      { status: 200, body: { ...GAME, seats: [], takenSeats: 0, eventSeq: 2 } },
    ]);
    renderLobby();
    await screen.findByText('Лира');
    await waitFor(() =>
      expect(screen.queryByText('Лира')).not.toBeInTheDocument(),
    );
  });

  it('по изменению игры перечитывает лобби', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: GAME },
      { status: 200, body: { ...GAME, seats: [], takenSeats: 0 } },
    ]);
    renderLobby();
    await screen.findByText('Лира');

    act(() =>
      fake().receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 2,
        kind: 'seat.freed',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Лира')).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText('Свободное место')).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Чужая игра не трогает эту страницу.
    act(() =>
      fake().receive(GAME_SOCKET.changed, {
        gameId: 'другая',
        seq: 9,
        kind: 'seat.freed',
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('убранному из игры показывает, что лобби закрыто', async () => {
    stubFetch([{ status: 200, body: GAME }]);
    renderLobby();
    await screen.findByText('Лира');

    act(() =>
      fake().receive(GAME_SOCKET.closed, {
        gameId: GAME.id,
        reason: 'removed',
      }),
    );
    expect(await screen.findByText('Вас убрали из игры')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К списку игр' })).toHaveAttribute(
      'href',
      '/games',
    );
    expect(screen.queryByText('Лира')).not.toBeInTheDocument();
  });

  it('новая запись журнала встаёт сверху открытого журнала мастера', async () => {
    stubFetch([
      { status: 200, body: { ...GAME, role: 'master' } },
      { status: 200, body: { events: [entered(1, 'Аня')], hasMore: false } },
      // Лобби перечитывается по изменению.
      { status: 200, body: { ...GAME, role: 'master' } },
    ]);
    renderLobby('m1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Журнал' }));
    const drawer = await screen.findByRole('dialog', { name: 'Журнал игры' });
    await within(drawer).findByText(/Аня/);

    act(() => {
      fake().receive(GAME_SOCKET.event, {
        gameId: GAME.id,
        event: entered(2, 'Боб'),
      });
      fake().receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 2,
        kind: 'member.entered',
      });
    });
    const authors = await within(drawer).findAllByText(/· (Аня|Боб)$/);
    expect(authors.map((el) => el.textContent)).toEqual([
      expect.stringContaining('Боб'),
      expect.stringContaining('Аня'),
    ]);
  });
});
