import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Bookmark } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { renderWithProviders } from '../../test/render';
import BookmarksPage from './BookmarksPage';

const createdAt = '2026-10-19T10:00:00.000Z';
const me = {
  id: 'me',
  login: 'me',
  nickname: 'Я',
  settings: DEFAULT_USER_SETTINGS,
};
const bookmarks: Bookmark[] = [
  {
    kind: 'item',
    targetId: 'i1',
    createdAt,
    target: {
      name: 'Длинный меч',
      authorId: 'u2',
      authorNickname: 'Аня',
      image: null,
    },
  },
  { kind: 'item', targetId: 'i2', createdAt, target: null },
  {
    kind: 'monster',
    targetId: 'm1',
    createdAt,
    target: {
      name: 'Аболет',
      authorId: 'u2',
      authorNickname: 'Аня',
      image: null,
    },
  },
  {
    kind: 'character',
    targetId: 'c1',
    createdAt,
    target: {
      name: 'Торин',
      authorId: 'me',
      authorNickname: 'Я',
      mainImage: null,
    },
  },
];

function renderPage(route = '/bookmarks') {
  const fetchMock = vi.fn<typeof fetch>((_url, init) =>
    Promise.resolve(
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(bookmarks)),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<BookmarksPage />, {
    route,
    auth: { user: me },
  });
  return fetchMock;
}

describe('BookmarksPage', () => {
  it('разделы по виду, автор — «вы» или ник, плашку можно убрать', async () => {
    const fetchMock = renderPage();

    const characters = (
      await screen.findByRole('heading', { name: 'Персонажи' })
    ).parentElement!;
    expect(
      within(characters).getByRole('link', { name: 'Торин' }),
    ).toHaveAttribute('href', '/characters/c1');
    expect(within(characters).getByText('вы')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Длинный меч' })).toHaveAttribute(
      'href',
      '/items/i1',
    );
    expect(screen.getByRole('link', { name: 'Аболет' })).toHaveAttribute(
      'href',
      '/monsters/m1',
    );
    expect(screen.getAllByText('Аня')).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Монстры' }),
    ).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Убрать' }));
    await vi.waitFor(() =>
      expect(screen.queryByText('Автор закрыл доступ')).not.toBeInTheDocument(),
    );
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/bookmarks\/item\/i2$/);
    expect(init?.method).toBe('DELETE');
  });

  it('вид и поиск из адреса; плашки при поиске не видны', async () => {
    renderPage('/bookmarks?kind=item&q=меч');
    expect(
      await screen.findByRole('link', { name: 'Длинный меч' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Торин')).not.toBeInTheDocument();
    expect(screen.queryByText('Автор закрыл доступ')).not.toBeInTheDocument();
  });

  it('ничего не нашлось', async () => {
    renderPage('/bookmarks?q=посох');
    expect(await screen.findByText('Ничего не нашлось')).toBeInTheDocument();
  });
});
