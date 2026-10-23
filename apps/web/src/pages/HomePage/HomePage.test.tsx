import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  type GameDetail,
  type GameListItem,
  type MapListItem,
} from 'shared';
import { sampleCharacter } from '../../test/characterFixture';
import { renderWithProviders } from '../../test/render';
import HomePage from './HomePage';

const ME = { id: 'u1', nickname: 'Михаил' };
const USER = { ...ME, login: 'misha', settings: DEFAULT_USER_SETTINGS };

const RUNNING: GameListItem = {
  id: 'g-run',
  name: 'Пепельные земли',
  master: ME,
  seatCount: 4,
  takenSeats: 1,
  hasPassword: false,
  role: 'master',
  sessionStartedAt: new Date(Date.now() - 80 * 60_000).toISOString(),
  createdAt: '2026-10-20T00:00:00.000Z',
};
const OPEN: GameListItem = {
  ...RUNNING,
  id: 'g-open',
  name: 'Шахты',
  master: { id: 'm2', nickname: 'Олег' },
  role: null,
  sessionStartedAt: null,
};
const DETAIL: GameDetail = {
  ...RUNNING,
  seats: [
    {
      user: { id: 'u2', nickname: 'Аня' },
      character: {
        id: sampleCharacter.id,
        name: sampleCharacter.name,
        species: sampleCharacter.species,
        classes: sampleCharacter.classes,
      },
      allowHandover: false,
      controller: null,
      seatedAt: '2026-10-20T00:00:00.000Z',
    },
  ],
  scene: {
    id: 's1',
    name: 'Склеп короля',
    open: true,
    fog: false,
    sightRange: 60,
  },
  eventSeq: 0,
  members: [],
};
const MAP = {
  id: 'map1',
  name: 'Таверна',
  seq: 1,
  width: 32,
  depth: 32,
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  startCount: 2,
} satisfies MapListItem;

// Ответы по адресу: главная зовёт несколько маршрутов разом.
function stubApi(routes: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = input.toString();
      const key = Object.keys(routes).find((path) => url.endsWith(path));
      if (!key) return Promise.resolve(new Response('{}', { status: 500 }));
      return Promise.resolve(new Response(JSON.stringify(routes[key])));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('показывает идущую встречу, свои игры, открытые, персонажей и карты', async () => {
    stubApi({
      '/games': [RUNNING, OPEN],
      [`/games/${RUNNING.id}`]: DETAIL,
      '/characters': [sampleCharacter],
      '/maps': [MAP],
      '/bookmarks': [],
    });
    renderWithProviders(<HomePage />, { auth: { user: USER } });

    const now = await screen.findByRole('link', { name: 'На сцену' });
    expect(now).toHaveAttribute('href', `/games/${RUNNING.id}/scene`);
    expect(
      screen.getByText(/Сцена «Склеп короля» · открыта игрокам/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Идёт встреча · 1 ч 20 мин/)).toBeInTheDocument();

    const mine = screen.getByRole('region', { name: 'Мои игры' });
    expect(within(mine).getByText('Пепельные земли')).toBeInTheDocument();

    const joinable = screen.getByRole('region', { name: 'Можно сесть' });
    expect(
      within(joinable).getByRole('link', { name: 'Сесть в игру Шахты' }),
    ).toHaveAttribute('href', `/games/${OPEN.id}`);

    const strip = screen.getByRole('region', { name: 'Мои персонажи' });
    expect(
      within(strip).getByText(new RegExp(`в «${RUNNING.name}»`)),
    ).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: /Новый/ })).toHaveAttribute(
      'href',
      '/characters/new',
    );
    expect(screen.getByRole('link', { name: 'Таверна' })).toHaveAttribute(
      'href',
      '/maps/map1',
    );
  });

  it('новичку показывает три шага и игры, где ищут игроков', async () => {
    stubApi({
      '/games': [OPEN],
      '/characters': [],
      '/maps': [],
      '/bookmarks': [],
    });
    renderWithProviders(<HomePage />, { auth: { user: USER } });

    expect(
      await screen.findByText('Добро пожаловать за стол, Михаил'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Создать персонажа' }),
    ).toHaveAttribute('href', '/characters/new');
    const looking = screen.getByRole('region', { name: 'Ищут игроков' });
    expect(within(looking).getByText('Шахты')).toBeInTheDocument();
    expect(within(looking).getByText('Нужен персонаж')).toBeInTheDocument();
  });

  it('упавший список не роняет страницу и не выдаёт её за пустую', async () => {
    stubApi({ '/games': [], '/characters': [], '/bookmarks': [] });
    renderWithProviders(<HomePage />, { auth: { user: USER } });

    expect(
      await screen.findByText(/Не удалось загрузить: карты/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Добро пожаловать за стол/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Мои персонажи' }),
    ).toBeInTheDocument();
  });
});
