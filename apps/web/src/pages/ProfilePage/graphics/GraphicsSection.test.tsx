import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../../features/auth/authApi';
import { renderWithProviders } from '../../../test/render';
import GraphicsSection from './GraphicsSection';

const me: AuthUser = {
  id: 'u1',
  login: 'hero',
  nickname: 'Hero',
  settings: {
    facingMarker: 'compass',
    graphicsQuality: 'medium',
    healthMarkStyle: 'plate',
  },
};

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GraphicsSection', () => {
  it('качество графики: «Высокое» выбрать нельзя, «Низкое» сохраняется', async () => {
    const fetchMock = stubFetch(200, {
      facingMarker: 'compass',
      graphicsQuality: 'low',
      healthMarkStyle: 'plate',
    });
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: /Среднее/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Высокое/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Низкое/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(init.body as string)).toEqual({ graphicsQuality: 'low' });
  });
});
