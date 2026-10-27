import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  GAME_SOCKET,
  emptyRefsView,
  type GameFigure,
  type GameFigures,
  type GameMoveMode,
  type GameSceneEditMessage,
  type GameSceneFogMessage,
  type GameSceneView,
  type MapObject,
  type MapObjectRefsView,
} from 'shared';
import type {
  FigureInput,
  ObjectImagePaths,
  SceneWalks,
} from '../../features/maps/MapScene';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import { createFakeGameSocket } from '../../test/fakeGameSocket';
import { renderWithProviders } from '../../test/render';
import { GAME, urlOf } from '../GameLobbyPage/lobbyTestKit';
import GameScenePage from './GameScenePage';

// Страница сцены (docs/plan/done/game.md, этап 5). В jsdom нет WebGL — вместо сцены заглушка,
// которая показывает, что ей передали.
vi.mock('../../features/maps/MapScene', async () => {
  const { useEffect } = await import('react');
  return {
    default: function MapSceneStub({
      map,
      refs,
      objectImages,
      hideContainerContents,
      onReady,
      figures,
      figureGhosts,
      readoutAfter,
      walks,
      figureDrag,
    }: {
      map: MapViewState;
      refs: MapObjectRefsView;
      objectImages: ObjectImagePaths;
      hideContainerContents: boolean;
      onReady: () => void;
      figures?: FigureInput[];
      figureGhosts?: FigureInput[];
      readoutAfter?: ReactNode;
      walks?: SceneWalks;
      figureDrag?: unknown;
    }) {
      useEffect(onReady, [onReady]);
      const names = Object.values(refs.monsters).map((m) =>
        m.missing === null ? m.name : '?',
      );
      return (
        <>
          <p>Сцена: {names.join(', ')}</p>
          <p>{objectImages.monster('g1', 2)}</p>
          <p>Объектов: {map.objects.byId.size}</p>
          {hideContainerContents && <p>Содержимое скрыто</p>}
          {figures?.map((figure) => (
            <p key={figure.id}>
              Фигурка: {figure.name} {figure.at.join(',')} {figure.image}
            </p>
          ))}
          {readoutAfter}
          {figureDrag !== undefined && <p>Фигурки можно брать</p>}
          {[...(walks ?? [])].map(([key, walk]) => (
            <p key={key}>
              Ход: {key}{' '}
              {walk.kind === 'walk'
                ? walk.path.map((c) => c?.join(',') ?? '?').join(' → ')
                : 'ждёт'}
            </p>
          ))}
          {figureGhosts?.map((figure) => (
            <p key={figure.id}>
              Тень: {figure.name} {figure.at.join(',')}
            </p>
          ))}
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
  // Режим мастера запоминается в браузере (docs/plan/done/scene-page.md): каждый тест — с «Игры».
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const base = `/games/${GAME.id}`;
const VIEW: GameSceneView = {
  seq: 0,
  size: { width: 4, depth: 4 },
  palette: ['air'],
  blocks: [],
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
        model: null,
        image: null,
      },
    },
  },
  scene: { id: 's1', name: 'Пещера', open: true, fog: false, sightRange: 60 },
  contentsHidden: true,
  fog: null,
};

function stub(
  responses: Record<
    string,
    (init?: RequestInit) => { status: number; body?: unknown }
  >,
) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const key = `${init?.method ?? 'GET'} ${urlOf(input).replace(/^.*\/api/, '')}`;
    // Фигурки (этап 7) нужны не каждому тесту: без ответа — «нет активной сцены».
    const route =
      responses[key] ??
      (key.endsWith('/scene/figures') ? () => ({ status: 404 }) : undefined);
    if (!route) return Promise.reject(new Error(`Нет ответа для ${key}`));
    const { status, body } = route(init);
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

const LIRA: GameFigure = {
  character: { id: 'c1', name: 'Лира' },
  ownerId: 'u2',
  at: [0, 1, 0],
  facing: 0,
  size: 'medium',
  image: { id: 'i1', thumbVersion: 3 },
  model: null,
  speed: 30,
  climb: null,
  moved: 0,
  dashes: 0,
  canMove: true,
  health: null,
  hitPoints: { current: 10, max: 12, temp: 0 },
};

// Режим хода — бой (раунд 1), если не сказано иначе: так запас тратится, как раньше.
function figuresOf(
  eventSeq: number,
  figures: GameFigure[],
  mode: GameMoveMode = 'tactical',
): GameFigures {
  const round = mode === 'tactical' ? 1 : null;
  return { sceneId: 's1', eventSeq, mode, round, figures, unplaced: [] };
}

// Встреча идёт: вне неё игрок только смотрит сцену.
const STARTED = '2026-10-25T10:00:00.000Z';

describe('GameScenePage', () => {
  it('мастер видит запас фигурок, начинает новый раунд и в «Правке» ставит персонажа «Не на сцене»', async () => {
    const fetchMock = stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({
        status: 200,
        body: {
          ...figuresOf(3, [{ ...LIRA, moved: 20, dashes: 1 }]),
          unplaced: [{ id: 'c2', name: 'Борн' }],
        },
      }),
      [`POST ${base}/figures/round`]: () => ({
        status: 200,
        body: {
          ...figuresOf(4, [LIRA]),
          unplaced: [{ id: 'c2', name: 'Борн' }],
        },
      }),
    });
    renderScene('m1');
    const user = userEvent.setup();

    // В списке «Участники» — остаток запаса и хиты из листа (docs/plan/done/scene-page.md, этап 2).
    // Группы свёрнуты, пока их не раскроют.
    await user.click(await screen.findByRole('button', { name: /^Герои/ }));
    expect(await screen.findByText('40 фт')).toBeInTheDocument();
    expect(screen.getByText('10/12')).toBeInTheDocument();
    // Бой и раунд — во вкладке «Сцена» (замечания после первой партии, вариант Б).
    await user.click(screen.getByRole('button', { name: 'Сцена' }));
    await user.click(screen.getByRole('button', { name: 'Новый раунд' }));
    await user.click(screen.getByRole('button', { name: 'Участники' }));
    expect(await screen.findByText('30 фт')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          init?.method === 'POST' && urlOf(input).endsWith('/figures/round'),
      ),
    ).toBe(true);

    // «Не на сцене» — дело «Существ» в «Правке»: в «Игре» мастер только ходит.
    expect(
      screen.queryByRole('button', { name: 'Поставить на сцену: Борн' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Правка' }));
    expect(
      screen.queryByRole('button', { name: 'Поставить на сцену: Борн' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Существа' }));
    await user.click(
      screen.getByRole('button', { name: 'Поставить на сцену: Борн' }),
    );
    expect(
      within(
        screen.getByRole('status', { name: 'Выбрано на сцене' }),
      ).getByText('щёлкните клетку, куда поставить'),
    ).toBeInTheDocument();
  });

  it('мастер начинает и заканчивает бой; вне боя запас не тратится и «Рывка» нет', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({
        status: 200,
        body: figuresOf(3, [LIRA], 'free'),
      }),
      [`PUT ${base}/figures/mode`]: (init) => {
        const { mode } = JSON.parse(init?.body as string) as {
          mode: GameMoveMode;
        };
        return { status: 200, body: figuresOf(4, [LIRA], mode) };
      },
    });
    renderScene('m1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /^Герои/ }));
    await user.click(await screen.findByRole('button', { name: 'Лира' }));
    expect(screen.getByText('До 30 фт за ход')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Рывок: Лира' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Новый раунд' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Сцена' }));
    const combat = screen.getByRole('region', { name: 'Бой' });
    await user.click(
      within(combat).getByRole('button', { name: 'Начать бой' }),
    );
    expect(await within(combat).findByText('Раунд 1')).toBeInTheDocument();
    expect(
      within(combat).getByRole('button', { name: 'Новый раунд' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Участники' }));
    expect(screen.getByText('Осталось 30 из 30 фт')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Рывок: Лира' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Сцена' }));
    await user.click(screen.getByRole('button', { name: 'Закончить бой' }));
    expect(
      await screen.findByRole('button', { name: 'Начать бой' }),
    ).toBeInTheDocument();
  });

  it('управление отдали посреди игры — фигурку можно выбрать без перезагрузки', async () => {
    let figures = figuresOf(3, [{ ...LIRA, ownerId: 'u2', canMove: false }]);
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'member', sessionStartedAt: STARTED },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({ status: 200, body: figures }),
    });
    renderScene('u3');
    // Чужая фигурка — в «Отряде», своей на вкладке «Персонаж» нет.
    expect(
      await screen.findByText(/Вашего персонажа нет на сцене/),
    ).toBeInTheDocument();
    figures = figuresOf(4, [{ ...LIRA, ownerId: 'u2', canMove: true }]);
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 4,
        kind: 'seat.controller',
      }),
    );
    expect(
      await screen.findByRole('button', { name: 'Ходить' }),
    ).toBeInTheDocument();
  });

  it('чужое перетаскивание видно тенью, пока фигурку не отпустили', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({
        status: 200,
        body: figuresOf(3, [LIRA]),
      }),
    });
    renderScene('u3');
    await screen.findByText(/Фигурка: Лира/);
    const drag = (at: [number, number, number] | null) =>
      act(() =>
        socket.current?.receive(GAME_SOCKET.figureDragged, {
          gameId: GAME.id,
          characterId: 'c1',
          at,
        }),
      );
    drag([2, 1, 3]);
    expect(await screen.findByText('Тень: Лира 2,1,3')).toBeInTheDocument();
    drag(null);
    expect(screen.queryByText(/Тень: Лира/)).not.toBeInTheDocument();
  });

  it('путь хода по сокету — фигурка идёт по клеткам', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({
        status: 200,
        body: figuresOf(3, [LIRA]),
      }),
    });
    renderScene('u3');
    await screen.findByText(/Фигурка: Лира/);
    act(() =>
      socket.current?.receive(GAME_SOCKET.walked, {
        gameId: GAME.id,
        sceneId: VIEW.scene.id,
        seq: 4,
        walker: { kind: 'figure', characterId: 'c1' },
        path: [[0, 1, 0], [0, 1, 1], null],
      }),
    );
    expect(
      await screen.findByText('Ход: figure:c1 0,1,0 → 0,1,1 → ?'),
    ).toBeInTheDocument();
  });

  it('игрок выбирает свою фигурку по имени, чужую — нет; запас правит только мастер', async () => {
    const born = {
      ...LIRA,
      character: { id: 'c2', name: 'Борн' },
      ownerId: 'u3',
      canMove: false,
    };
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player', sessionStartedAt: STARTED },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({
        status: 200,
        body: figuresOf(3, [LIRA, born]),
      }),
    });
    renderScene('u2');
    const user = userEvent.setup();

    // «Персонаж» (docs/plan/done/scene-page.md, этап 5): свой крупно и «Ходить».
    expect(
      await screen.findByRole('button', { name: 'Ходить' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Новый раунд' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Рывок/ }),
    ).not.toBeInTheDocument();
    // Чужой герой — в «Отряде», щелчок открывает карточку, а не выбирает.
    await user.click(screen.getByRole('button', { name: 'Отряд' }));
    expect(screen.getByRole('button', { name: 'Борн' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Персонаж' }));
    await user.click(screen.getByRole('button', { name: 'Ходить' }));
    expect(screen.getByRole('button', { name: /Идёт/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Подсказка и запас — плашкой на сцене, а не в панели.
    const plaque = screen.getByRole('status', { name: 'Выбрано на сцене' });
    expect(
      within(plaque).getByText('щелчок по подсвеченной клетке — ход'),
    ).toBeInTheDocument();
    expect(
      within(plaque).getByText('осталось 30 из 30 фт'),
    ).toBeInTheDocument();
    // Бой — плашкой сверху сцены; уведомления нет: игрок вошёл уже в бой.
    expect(screen.getByText('Бой · раунд 1')).toBeInTheDocument();
    expect(screen.queryByText('Мастер начал бой')).not.toBeInTheDocument();
  });

  it('вне встречи игрок только смотрит: плашка, карточка без правок, фигурку не выбрать; встреча началась — ходит', async () => {
    let game = { ...GAME, role: 'player' as const };
    stub({
      [`GET ${base}`]: () => ({ status: 200, body: game }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({
        status: 200,
        body: figuresOf(3, [LIRA]),
      }),
    });
    renderScene('u2');
    const user = userEvent.setup();

    expect(
      await screen.findByText('Ходить можно, когда мастер начнёт встречу.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Встреча не идёт · только просмотр'),
    ).toBeInTheDocument();
    // Плашка встречи — вместо плашки боя; уведомления нет: игрок вошёл уже вне встречи.
    expect(screen.queryByText('Бой · раунд 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ходить' }),
    ).not.toBeInTheDocument();
    // Фигурки на сцене не берутся: ни выбрать, ни потянуть.
    await screen.findByText(/Фигурка: Лира/);
    expect(screen.queryByText('Фигурки можно брать')).not.toBeInTheDocument();

    game = { ...game, sessionStartedAt: STARTED };
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 4,
        kind: 'session.started',
      }),
    );
    expect(
      await screen.findByRole('button', { name: 'Ходить' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('alert', { name: 'Встреча началась' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Бой · раунд 1')).toBeInTheDocument();
    expect(screen.getByText('Фигурки можно брать')).toBeInTheDocument();

    // Мастер завершил встречу посреди хода — выбор снят.
    await user.click(screen.getByRole('button', { name: 'Ходить' }));
    game = { ...game, sessionStartedAt: null };
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 5,
        kind: 'session.ended',
      }),
    );
    expect(
      await screen.findByRole('alert', { name: 'Мастер завершил встречу' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: 'Выбрано на сцене' }),
    ).not.toBeInTheDocument();
  });

  it('игрок видит фигурки и перечитывает их после событий фигурок; старый ответ не откатывает', async () => {
    let figures = figuresOf(3, [LIRA]);
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/scene/figures`]: () => ({ status: 200, body: figures }),
    });
    renderScene('u2');
    expect(
      await screen.findByText(
        `Фигурка: Лира 0,1,0 ${base}/figures/c1/image?i=i1&v=3`,
      ),
    ).toBeInTheDocument();

    const born = {
      ...LIRA,
      character: { id: 'c2', name: 'Борн' },
      image: null,
    };
    figures = figuresOf(6, [LIRA, { ...born, at: [2, 1, 2] }]);
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 6,
        kind: 'figures.placed',
      }),
    );
    expect(await screen.findByText(/Фигурка: Борн 2,1,2/)).toBeInTheDocument();

    // Запоздавший ответ со старым номером журнала фигурки не откатывает.
    figures = figuresOf(5, [LIRA]);
    act(() =>
      socket.current?.receive(GAME_SOCKET.changed, {
        gameId: GAME.id,
        seq: 7,
        kind: 'seat.freed',
      }),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByText(/Фигурка: Борн/)).toBeInTheDocument();
  });

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
    expect(screen.getByText('Содержимое скрыто')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'В лобби' })).toHaveAttribute(
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
    expect(
      await screen.findByText('Лобби игры', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
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
    expect(
      await screen.findByText('Лобби игры', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
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

    await user.click(
      await screen.findByRole('button', { name: 'Сцена' }, { timeout: 3000 }),
    );
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
      scene: {
        id: 's2',
        name: 'Подвал',
        open: true,
        fog: false,
        sightRange: 60,
      },
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

  it('игрок видит правку мастера сразу, после пропуска перечитывает сцену', async () => {
    let reads = 0;
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => {
        reads++;
        return { status: 200, body: VIEW };
      },
    });
    renderScene('u2');
    expect(
      await screen.findByText('Объектов: 0', {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    const goblin: MapObject = {
      id: 1,
      at: [1, 1, 1],
      hidden: false,
      kind: 'monster',
      monsterId: 'g1',
      facing: 0,
    };
    const edit = (seq: number): GameSceneEditMessage => ({
      gameId: GAME.id,
      sceneId: 's1',
      seq,
      changes: {
        cells: [],
        paletteAdded: [],
        objects: [{ id: seq, before: null, after: { ...goblin, id: seq } }],
      },
      refs: emptyRefsView(),
    });
    act(() => socket.current?.receive(GAME_SOCKET.sceneEdit, edit(1)));
    expect(await screen.findByText('Объектов: 1')).toBeInTheDocument();
    // Правка другой сцены странице не нужна.
    act(() =>
      socket.current?.receive(GAME_SOCKET.sceneEdit, {
        ...edit(2),
        sceneId: 's9',
      }),
    );
    expect(reads).toBe(1);
    // Номер через один — правка пропущена: сцена перечитывается.
    act(() => socket.current?.receive(GAME_SOCKET.sceneEdit, edit(3)));
    await vi.waitFor(() => expect(reads).toBe(2), { timeout: 3000 });
    // Инструментов у игрока нет.
    expect(
      screen.queryByRole('button', { name: 'Отменить' }),
    ).not.toBeInTheDocument();
  });

  it('туман без правки: ложится на копию с тем же номером, с другим — сцена перечитывается', async () => {
    let reads = 0;
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'player' },
      }),
      [`GET ${base}/scene`]: () => {
        reads++;
        return {
          status: 200,
          body: { ...VIEW, fog: { explored: [], visible: [] } },
        };
      },
    });
    renderScene('u2');
    expect(
      await screen.findByText('Объектов: 0', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const goblin: MapObject = {
      id: 1,
      at: [1, 1, 1],
      hidden: false,
      kind: 'monster',
      monsterId: 'g1',
      facing: 0,
    };
    const fog = (seq: number): GameSceneFogMessage => ({
      gameId: GAME.id,
      sceneId: 's1',
      seq,
      changes: {
        cells: [],
        paletteAdded: [],
        objects: [{ id: 1, before: null, after: goblin }],
      },
      refs: emptyRefsView(),
      fog: {
        explored: [{ cx: 0, cy: 0, cz: 0, bits: 'AQ==' }],
        visible: [],
      },
    });
    // Гоблин вошёл в поле зрения после хода фигурки.
    act(() => socket.current?.receive(GAME_SOCKET.sceneFog, fog(0)));
    expect(await screen.findByText('Объектов: 1')).toBeInTheDocument();
    expect(reads).toBe(1);
    act(() => socket.current?.receive(GAME_SOCKET.sceneFog, fog(4)));
    await vi.waitFor(() => expect(reads).toBe(2), { timeout: 3000 });
  });

  it('мастер правит сцену инструментами редактора: без «Хода», отмена — запросом', async () => {
    const fetchMock = stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`POST ${base}/scenes/s1/undo`]: () => ({
        status: 200,
        body: {
          seq: 1,
          changedCells: 0,
          conflicts: 0,
          paletteAdded: [],
          changes: { cells: [], paletteAdded: [] },
          createdObjectIds: [],
          refs: emptyRefsView(),
        },
      }),
    });
    renderScene('m1');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('radio', { name: 'Правка' }, { timeout: 3000 }),
    );
    await user.click(screen.getByRole('button', { name: 'Строить' }));
    expect(screen.getByText('На карте: 0')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ход' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            urlOf(url).endsWith('/scenes/s1/undo') && init?.method === 'POST',
        ),
      ).toBe(true),
    );
  });

  it('мастер переключает «Игру» и «Правку» клавишей Ё; в «Игре» нет ни инструментов, ни отмены', async () => {
    const fetchMock = stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
    });
    renderScene('m1');
    const user = userEvent.setup();

    const play = await screen.findByRole(
      'radio',
      { name: 'Игра' },
      { timeout: 3000 },
    );
    expect(play).toBeChecked();
    // Отмена и возврат — только в «Правке», и Ctrl+Z в «Игре» ничего не шлёт.
    expect(
      screen.queryByRole('button', { name: 'Отменить' }),
    ).not.toBeInTheDocument();
    await user.keyboard('{Control>}z{/Control}');
    expect(
      fetchMock.mock.calls.some(([url]) => urlOf(url).endsWith('/undo')),
    ).toBe(false);
    expect(
      screen.queryByRole('button', { name: 'Строить' }),
    ).not.toBeInTheDocument();
    // Цифры инструментов в «Игре» молчат.
    await user.keyboard('2');
    expect(screen.queryByText('На карте: 0')).not.toBeInTheDocument();

    await user.keyboard('[Backquote]');
    expect(screen.getByRole('radio', { name: 'Правка' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Строить' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Отменить' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('scene.mode')).toBe('edit');
    await user.keyboard('[Backquote]');
    expect(screen.getByRole('radio', { name: 'Игра' })).toBeChecked();
  });

  it('мастер видит число новых записей на вкладке «Журнал», а в ней — записи по раундам', async () => {
    const at = '2026-10-24T16:00:00Z';
    const entered = {
      seq: 3,
      kind: 'member.entered',
      actor: { id: 'u2', nickname: 'Боб' },
      as: null,
      sceneId: null,
      createdAt: at,
      intent: null,
      result: null,
    };
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'master' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
      [`GET ${base}/events`]: () => ({
        status: 200,
        body: {
          events: [
            {
              ...entered,
              seq: 2,
              kind: 'figures.round',
              actor: { id: 'm1', nickname: 'Я' },
              result: {
                scene: { id: 's1', name: 'Пещера' },
                count: 1,
                round: 2,
              },
            },
            { ...entered, seq: 1, actor: { id: 'u3', nickname: 'Ада' } },
          ],
          hasMore: false,
        },
      }),
    });
    renderScene('m1');
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Журнал' }, { timeout: 3000 });

    // Запись игрока пришла, пока вкладка закрыта, — на ней число; своё мастер не считает.
    act(() => {
      socket.current?.receive(GAME_SOCKET.event, {
        gameId: GAME.id,
        event: entered,
      });
      socket.current?.receive(GAME_SOCKET.event, {
        gameId: GAME.id,
        event: { ...entered, seq: 4, actor: { id: 'm1', nickname: 'Я' } },
      });
    });
    await user.click(
      await screen.findByRole('button', { name: 'Журнал, новых: 1' }),
    );

    // Запись нового раунда — разделитель с номером; живые записи сверху первой страницы.
    expect(await screen.findByText(/Раунд 2 ·/)).toBeInTheDocument();
    expect(screen.getAllByText(/Боб/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ада/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Журнал' })).toBeInTheDocument();
  });

  it('у игрока нет переключателя режима', async () => {
    stub({
      [`GET ${base}`]: () => ({
        status: 200,
        body: { ...GAME, role: 'member' },
      }),
      [`GET ${base}/scene`]: () => ({ status: 200, body: VIEW }),
    });
    renderScene('u3');
    expect(await screen.findByText(/Сцена:/)).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: 'Правка' }),
    ).not.toBeInTheDocument();
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
