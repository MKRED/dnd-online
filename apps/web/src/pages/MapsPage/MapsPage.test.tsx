import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import MapsPage from './MapsPage';

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

const MAP = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Двор',
  seq: 0,
  width: 20,
  depth: 12,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  startCount: 3,
};

describe('MapsPage', () => {
  it('показывает размер карт и число стартов в списке', async () => {
    stubFetch([
      {
        status: 200,
        body: [MAP, { ...MAP, id: 'empty', name: 'Пустошь', startCount: 0 }],
      },
    ]);
    renderWithProviders(<MapsPage />, { route: '/maps' });

    expect(await screen.findByRole('link', { name: 'Двор' })).toHaveAttribute(
      'href',
      `/maps/${MAP.id}`,
    );
    expect(screen.getAllByText('20 × 12')).toHaveLength(2);
    expect(screen.getByText('3 старта')).toBeInTheDocument();
    expect(screen.getByText('нет стартов')).toBeInTheDocument();
  });

  async function openRename(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole('button', { name: 'Действия с картой «Двор»' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Переименовать' }),
    );
  }

  it('переименовывает карту из меню «⋯»; Esc закрывает поле без запроса', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: [MAP] },
      { status: 200, body: { ...MAP, name: 'Двор замка' } },
    ]);
    renderWithProviders(<MapsPage />, { route: '/maps' });
    const user = userEvent.setup();

    await openRename(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('Название карты')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await openRename(user);
    const field = screen.getByLabelText('Название карты');
    await user.clear(field);
    expect(
      screen.getByRole('button', { name: 'Сохранить название' }),
    ).toBeDisabled();
    await user.type(field, '  Двор замка {Enter}');

    expect(
      await screen.findByRole('link', { name: 'Двор замка' }),
    ).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(new RegExp(`/maps/${MAP.id}$`));
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Двор замка' });
  });

  it('ошибка переименования остаётся под полем', async () => {
    stubFetch([
      { status: 200, body: [MAP] },
      {
        status: 400,
        body: { message: 'Название карты — от 1 до 100 символов' },
      },
    ]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<MapsPage />, { route: '/maps' });
    const user = userEvent.setup();

    await openRename(user);
    await user.type(screen.getByLabelText('Название карты'), '!{Enter}');

    expect(
      await screen.findByText('Название карты — от 1 до 100 символов'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Название карты')).toHaveValue('Двор!');
  });

  it('переключает список и плитки и запоминает выбор', async () => {
    localStorage.removeItem('maps.view');
    stubFetch([{ status: 200, body: [MAP] }]);
    renderWithProviders(<MapsPage />, { route: '/maps' });
    const user = userEvent.setup();
    await screen.findByRole('link', { name: 'Двор' });
    expect(screen.getByRole('radio', { name: 'Список' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Плитки' }));
    expect(screen.getByRole('radio', { name: 'Плитки' })).toBeChecked();
    expect(localStorage.getItem('maps.view')).toBe('grid');
    expect(screen.getByRole('link', { name: 'Двор' })).toBeInTheDocument();
    localStorage.removeItem('maps.view');
  });

  it('создаёт карту с заданным размером', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: [] },
      { status: 201, body: MAP },
    ]);
    renderWithProviders(<MapsPage />, { route: '/maps' });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Новая карта'), 'Двор');
    await user.clear(screen.getByRole('textbox', { name: 'Ширина' }));
    await user.type(screen.getByRole('textbox', { name: 'Ширина' }), '20');
    await user.clear(screen.getByRole('textbox', { name: 'Глубина' }));
    await user.type(screen.getByRole('textbox', { name: 'Глубина' }), '12');
    expect(
      screen.getByText(/Карта 20 × 12 клеток \(100 × 60 фт\)/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/maps$/);
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Двор',
      width: 20,
      depth: 12,
    });
  });

  it('не даёт создать карту с пустой шириной', async () => {
    stubFetch([{ status: 200, body: [] }]);
    renderWithProviders(<MapsPage />, { route: '/maps' });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Новая карта'), 'Двор');
    await user.clear(screen.getByRole('textbox', { name: 'Ширина' }));

    expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled();
    expect(
      screen.getByText('Ширина и глубина — от 1 до 256 клеток.'),
    ).toBeInTheDocument();
  });
});
