import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  GAME_SOCKET,
  emptyRefsView,
  type GameSceneView,
  type MapObjectRefsView,
} from 'shared';
import type { ObjectImagePaths } from '../../features/maps/MapScene';
import { createFakeGameSocket } from '../../test/fakeGameSocket';
import { renderWithProviders } from '../../test/render';
import { GAME, urlOf } from '../GameLobbyPage/lobbyTestKit';
import GameScenePage from './GameScenePage';

// Страница сцены (docs/plan/game.md, этап 5). В jsdom нет WebGL — вместо сцены заглушка,
// которая показывает, что ей передали.
vi.mock('../../features/maps/MapScene', async () => {
  const { useEffect } = await import('react');
  return {
    default: function MapSceneStub({
      refs,
      objectImages,
      onReady,
    }: {
      refs: MapObjectRefsView;
      objectImages: ObjectImagePaths;
      onReady: () => void;
    }) {
      useEffect(onReady, [onReady]);
      const names = Object.values(refs.monsters).map((m) =>
        m.missing === null ? m.name : '?',
      );
      return (
        <>
          <p>Сцена: {names.join(', ')}</p>
          <p>{objectImages.monster('g1', 2)}</p>
        </>
      );
    },
  };
});

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
const VIEW: GameSceneView = {
  seq: 0,
  size: { width: 4, depth: 4 },
  palette: ['air'],
  chunks: [],
  objects: [],
  nextObjectId: 1,
  refs: {
    ...emptyRefsView(),
    monsters: {
      g1: {
        missing: null,
        name: 'Гоблин',
        size: 'small',
        role: 'regular',
        image: null,
      },
    },
  },
  scene: { id: 's1', name: 'Пещера', open: true },
};

function stub(
  responses: Record<string, () => { status: number; body?: unknown }>,
) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const key = `${init?.method ?? 'GET'} ${urlOf(input).replace(/^.*\/api/, '')}`;
    const route = responses[key];
    if (!route) return Promise.reject(new Error(`Нет ответа для ${key}`));
    const { status, body } = route();
    return Promise.resolve(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderScene(userId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/games/:id/scene" element={<GameScenePage />} />
      <Route path="/games/:id" element={<p>Лобби игры</p>} />
    </Routes>,
    {
      route: `${base}/scene`,
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

describe('GameScenePage', () => {
  it('игрок видит открытую сцену с картинками из библиотеки игры', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
    });
    renderScene('u2');

    expect(await screen.findByText('Сцена: Гоблин')).toBeInTheDocument();
    expect(
      screen.getByText(`${base}/scene/images/monster/g1?variant=thumb&v=2`),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Пещера' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← В лобби' })).toHaveAttribute(
      'href',
      base,
    );
    // Переключатель — только у мастера.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(await screen.findByText('Сцена готова')).toBeInTheDocument();
  });

  it('закрытая сцена отправляет игрока в лобби — и при входе, и когда мастер её закрыл', async () => {
    let closed = false;
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () =>
        closed
          ? { status: 403, body: { message: 'Мастер закрыл сцену' } }
          : { status: 200, body: VIEW },
    });
    renderScene('u2');
    await screen.findByText('Сцена: Гоблин');

    closed = true;
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 5,
        kind: 'scene.closed',
      }),
    );
    expect(await screen.findByText('Лобби игры')).toBeInTheDocument();
  });

  it('без доступа к сцене — сразу в лобби', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => ({
        status: 403,
        body: { message: 'Мастер закрыл сцену' },
      }),
    });
    renderScene('u2');
    expect(await screen.findByText('Лобби игры')).toBeInTheDocument();
  });

  it('мастер открывает и закрывает сцену прямо со страницы; смену сцены перечитывает', async () => {
    let view = { ...VIEW, scene: { ...VIEW.scene, open: false } };
    const fetchMock = stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: view }),
      [`PUT ${base}/scenes/open`]: () => ({
        status: 200,
        body: { open: true, scenes: [] },
      }),
    });
    renderScene('m1');
    const user = userEvent.setup();

    const toggle = await screen.findByRole('switch', {
      name: 'Открыта игрокам',
    });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(
      await screen.findByRole('switch', { name: 'Открыта игрокам' }),
    ).toBeChecked();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[1]?.body).toBe(JSON.stringify({ open: true }));

    // Мастер в другой вкладке сменил сцену — страница перечитывает её, мастера не уводит.
    view = {
      ...VIEW,
      refs: emptyRefsView(),
      scene: { id: 's2', name: 'Подвал', open: true },
    };
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 7,
        kind: 'scene.activated',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Подвал' }),
    ).toBeInTheDocument();
  });

  it('без активной сцены говорит об этом', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({
        status: 404,
        body: { message: 'В игре нет активной сцены' },
      }),
    });
    renderScene('m1');
    expect(
      await screen.findByText(/В игре нет активной сцены/),
    ).toBeInTheDocument();
  });
});
