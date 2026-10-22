import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS, GRAPHICS_PRESET_VALUES } from 'shared';
import type { AuthUser } from '../../../features/auth/authApi';
import { renderWithProviders } from '../../../test/render';
import GraphicsSection from './GraphicsSection';

const me: AuthUser = {
  id: 'u1',
  login: 'hero',
  nickname: 'Hero',
  settings: DEFAULT_USER_SETTINGS,
};

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const sentBody = (fetchMock: ReturnType<typeof stubFetch>) => {
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(init.body as string) as unknown;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GraphicsSection', () => {
  it('набор: «Высокое» выбрать нельзя, «Низкое» уходит со своими значениями', async () => {
    const low = {
      ...DEFAULT_USER_SETTINGS,
      graphicsPreset: 'low',
      ...GRAPHICS_PRESET_VALUES.low,
    };
    const fetchMock = stubFetch(200, low);
    const { authValue } = renderWithProviders(<GraphicsSection />, {
      auth: { user: me },
    });
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: /Среднее/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Высокое/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Низкое/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toEqual({
      graphicsPreset: 'low',
      ...GRAPHICS_PRESET_VALUES.low,
    });
    // Сразу, до ответа сервера: карточки моделей и без анимаций.
    expect(authValue.setUser).toHaveBeenNthCalledWith(1, {
      ...me,
      settings: low,
    });
  });

  it('настройка по одной переключает набор на «Своё» и шлёт все значения', async () => {
    const fetchMock = stubFetch(200, {
      ...DEFAULT_USER_SETTINGS,
      graphicsPreset: 'custom',
      creatureModels: 'party',
    });
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    await user.click(screen.getByText('Только отряд'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toEqual({
      graphicsPreset: 'custom',
      ...GRAPHICS_PRESET_VALUES.medium,
      creatureModels: 'party',
    });
  });

  it('сглаживание — переключатель; «Своё» начинается с того, что видно', async () => {
    const fetchMock = stubFetch(200, DEFAULT_USER_SETTINGS);
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    expect(
      screen.getByRole('switch', { name: /Сглаживание краёв/ }),
    ).toBeChecked();
    await user.click(screen.getByRole('switch', { name: /Сглаживание краёв/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toEqual({
      graphicsPreset: 'custom',
      ...GRAPHICS_PRESET_VALUES.medium,
      antialias: false,
    });
  });

  it('ползунок анимаций сохраняет, когда его отпустили', async () => {
    const fetchMock = stubFetch(200, {
      ...DEFAULT_USER_SETTINGS,
      graphicsPreset: 'custom',
      animationFps: 19,
    });
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    const slider = screen.getByRole('slider', { name: 'Частота анимаций' });
    expect(slider).toHaveAttribute('aria-valuenow', '18');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toMatchObject({
      graphicsPreset: 'custom',
      animationFps: 19,
    });
  });
});
