import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_SOCKET, type GameScenes, type MapListItem } from 'shared';
import { createFakeGameSocket } from '../../test/fakeGameSocket';
import { GAME, renderLobby, routeFetch, urlOf } from './lobbyTestKit';

// Сцены в лобби (docs/plan/done/game.md, этап 5): блок мастера и переход игроков на открытую
// сцену. Сокет поддельный.
const socket = vi.hoisted(() => ({
  current: null as ReturnType<typeof createFakeGameSocket> | null,
}));
vi.mock('../../features/games/gameSocket', () => ({
  acquireGameSocket: () => socket.current,
  releaseGameSocket: () => undefined,
}));

beforeEach(() => {
  socket.current = createFakeGameSocket();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const base = `/games/${GAME.id}`;
const MASTER_GAME = { ...GAME, role: 'master' as const };
const CAVE: MapListItem = {
  id: 'map1',
  name: 'Пещера',
  seq: 3,
  width: 12,
  depth: 12,
  startCount: 2,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
};
const scene = (id: string, name: string, active: boolean) => ({
  id,
  name,
  mapId: 'map1',
  active,
  createdAt: '2026-10-20T10:00:00.000Z',
});

describe('GameLobbyPage: сцены', () => {
  it('мастер добавляет сцену из своей карты и открывает её игрокам', async () => {
    let scenes: GameScenes = { open: false, scenes: [] };
    const fetchMock = routeFetch({
      [`GET ${base}`]: () => ({ status: 200, body: MASTER_GAME }),
      [`GET ${base}/scenes`]: () => ({ status: 200, body: scenes }),
      'GET /maps': () => ({ status: 200, body: [CAVE] }),
      [`POST ${base}/scenes`]: () => {
        scenes = { open: false, scenes: [scene('s1', 'Пещера', true)] };
        return { status: 201, body: scenes };
      },
      [`PUT ${base}/scenes/open`]: () => {
        scenes = { ...scenes, open: true };
        return { status: 200, body: scenes };
      },
    });
    renderLobby('m1');
    const user = userEvent.setup();

    expect(await screen.findByText(/Сцен пока нет/)).toBeInTheDocument();
    // Без активной сцены открывать нечего.
    expect(
      screen.getByRole('switch', { name: 'Открыта игрокам' }),
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Добавить сцену' }));
    const modal = await screen.findByRole('dialog', { name: 'Добавить сцену' });
    // Единственная карта выбрана сама.
    await within(modal).findByDisplayValue(/Пещера/);
    await user.click(within(modal).getByRole('button', { name: 'Добавить' }));
    expect(await screen.findByText('Активная')).toBeInTheDocument();
    const added = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(added?.[1]?.body as string)).toEqual({ mapId: 'map1' });
    expect(screen.getByRole('link', { name: 'К сцене' })).toHaveAttribute(
      'href',
      `${base}/scene`,
    );
    expect(
      screen.getByText('Игроки ждут в лобби: активная сцена им не видна.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Открыта игрокам' }));
    expect(
      await screen.findByText('Игроки видят активную сцену.'),
    ).toBeInTheDocument();
  });

  it('мастер меняет активную сцену и перезапускает после подтверждения', async () => {
    let scenes: GameScenes = {
      open: true,
      scenes: [scene('s1', 'Дом', true), scene('s2', 'Подвал', false)],
    };
    const fetchMock = routeFetch({
      [`GET ${base}`]: () => ({ status: 200, body: MASTER_GAME }),
      [`GET ${base}/scenes`]: () => ({ status: 200, body: scenes }),
      [`PUT ${base}/scenes/active`]: () => {
        scenes = {
          ...scenes,
          scenes: [scene('s1', 'Дом', false), scene('s2', 'Подвал', true)],
        };
        return { status: 200, body: scenes };
      },
      [`POST ${base}/scenes/s2/restart`]: () => {
        scenes = {
          ...scenes,
          scenes: [scene('s1', 'Дом', false), scene('s3', 'Подвал', true)],
        };
        return { status: 201, body: scenes };
      },
    });
    const confirm = vi.spyOn(window, 'confirm');
    renderLobby('m1');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Сделать активной' }),
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          urlOf(url).endsWith('/scenes/active') &&
          init?.body === JSON.stringify({ sceneId: 's2' }),
      ),
    ).toBe(true);

    // Отказ в подтверждении — ничего не перезапускается.
    confirm.mockReturnValueOnce(false);
    await user.click(
      await screen.findByRole('button', { name: 'Ещё: Подвал' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Перезапустить' }),
    );
    expect(
      fetchMock.mock.calls.some(([url]) => urlOf(url).endsWith('/restart')),
    ).toBe(false);

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Ещё: Подвал' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Перезапустить' }),
    );
    expect(confirm).toHaveBeenLastCalledWith(
      expect.stringContaining('Перезапустить сцену «Подвал»?'),
    );
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => urlOf(url).endsWith('/restart')),
      ).toBe(true),
    );
    confirm.mockRestore();
  });

  it('игрок видит открытую сцену и попадает на неё, когда мастер её открывает', async () => {
    let game = { ...GAME, scene: null as typeof GAME.scene };
    routeFetch({
      [`GET ${base}`]: () => ({ status: 200, body: game }),
    });
    renderLobby('u1');
    await screen.findByText('Лира');
    // Блока мастера у игрока нет, приглашения — пока сцена закрыта — тоже.
    expect(screen.queryByText('Сцены')).not.toBeInTheDocument();
    expect(screen.queryByText(/Мастер открыл сцену/)).not.toBeInTheDocument();

    game = { ...game, scene: { id: 's1', name: 'Пещера', open: true } };
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 2,
        kind: 'scene.opened',
      }),
    );
    expect(await screen.findByText('Страница сцены')).toBeInTheDocument();
  });

  it('правки сцены лобби не перечитывают', async () => {
    const fetchMock = routeFetch({
      [`GET ${base}`]: () => ({ status: 200, body: GAME }),
    });
    renderLobby('u1');
    await screen.findByText('Лира');
    const calls = fetchMock.mock.calls.length;
    act(() => {
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 2,
        kind: 'scene.edited',
      });
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 3,
        kind: 'member.entered',
      });
    });
    // Перечитал только вход в лобби.
    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBe(calls + 1));
  });

  it('игрок в лобби при открытой сцене видит приглашение, а не переход', async () => {
    routeFetch({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, scene: { id: 's1', name: 'Пещера', open: true } },
      }),
    });
    renderLobby('u1');
    expect(
      await screen.findByText('Мастер открыл сцену «Пещера»'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К сцене' })).toHaveAttribute(
      'href',
      `${base}/scene`,
    );
  });
});
