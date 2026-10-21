import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../features/auth/authApi';
import { renderWithProviders } from '../../test/render';
import SettingsCard from './SettingsCard';

const me: AuthUser = {
  id: 'u1',
  login: 'hero',
  nickname: 'Hero',
  settings: { facingMarker: 'compass', graphicsQuality: 'medium' },
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

describe('SettingsCard', () => {
  it('показывает текущий выбор и сохраняет новый сразу', async () => {
    const fetchMock = stubFetch(200, {
      facingMarker: 'chevrons',
      graphicsQuality: 'medium',
    });
    const { authValue } = renderWithProviders(<SettingsCard />, {
      auth: { user: me },
    });
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: /Компас/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Шевроны/ }));

    // Сначала сразу, до ответа сервера, потом — тем, что ответил сервер.
    expect(authValue.setUser).toHaveBeenNthCalledWith(1, {
      ...me,
      settings: { facingMarker: 'chevrons', graphicsQuality: 'medium' },
    });
    await waitFor(() => expect(authValue.setUser).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/profile\/settings$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      facingMarker: 'chevrons',
    });
  });

  it('при ошибке возвращает прежний выбор и показывает её', async () => {
    stubFetch(400, { statusCode: 400, message: 'Неизвестный вид' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { authValue } = renderWithProviders(<SettingsCard />, {
      auth: { user: me },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /Указатель/ }));

    expect(await screen.findByText('Неизвестный вид')).toBeInTheDocument();
    expect(authValue.setUser).toHaveBeenLastCalledWith(me);
  });

  it('качество графики: «Высокое» выбрать нельзя, «Низкое» сохраняется', async () => {
    const fetchMock = stubFetch(200, {
      facingMarker: 'compass',
      graphicsQuality: 'low',
    });
    renderWithProviders(<SettingsCard />, { auth: { user: me } });
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
