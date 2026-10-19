import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
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
};

describe('MapsPage', () => {
  it('показывает размер карт в списке', async () => {
    stubFetch([{ status: 200, body: [MAP] }]);
    renderWithProviders(<MapsPage />, { route: '/maps' });

    expect(await screen.findByText('Двор')).toBeInTheDocument();
    expect(screen.getByText('20 × 12')).toBeInTheDocument();
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
