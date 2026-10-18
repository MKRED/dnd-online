import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import BookmarkButton from './BookmarkButton';

const ID = '3f2b6c1e-0000-4000-8000-000000000001';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('BookmarkButton', () => {
  it('ставит закладку и снимает её', async () => {
    const fetchMock = vi.fn<typeof fetch>((_url, init) =>
      init?.method === 'DELETE'
        ? Promise.resolve(new Response(null, { status: 204 }))
        : json({ bookmarked: init?.method === 'PUT' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<BookmarkButton kind="item" id={ID} />);
    const user = userEvent.setup();

    const add = await screen.findByRole('button', {
      name: 'Добавить в закладки',
    });
    await vi.waitFor(() => expect(add).toBeEnabled());
    await user.click(add);
    const remove = await screen.findByRole('button', {
      name: 'Убрать из закладок',
    });
    expect(remove).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock.mock.calls[1][0]).toMatch(
      new RegExp(`/bookmarks/item/${ID}$`),
    );
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');

    await user.click(remove);
    await screen.findByRole('button', { name: 'Добавить в закладки' });
    expect(fetchMock.mock.calls[2][1]?.method).toBe('DELETE');
  });

  it('ошибка — текст сервера, звезда остаётся как была', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, init) =>
        init?.method === 'PUT'
          ? json({ message: 'Не найдено' }, 404)
          : json({ bookmarked: false }),
      ),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<BookmarkButton kind="effect" id={ID} />);

    const add = await screen.findByRole('button', {
      name: 'Добавить в закладки',
    });
    await vi.waitFor(() => expect(add).toBeEnabled());
    await userEvent.setup().click(add);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не найдено');
    expect(
      screen.getByRole('button', { name: 'Добавить в закладки' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });
});
