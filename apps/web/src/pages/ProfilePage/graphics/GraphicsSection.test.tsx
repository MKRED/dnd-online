import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

// Графика этого устройства — в браузере (замечания после первой партии, вариант А).
const stored = () =>
  JSON.parse(localStorage.getItem('graphics.device') ?? 'null') as unknown;

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('GraphicsSection', () => {
  it('набор: «Высокое» выбрать нельзя, «Низкое» сохраняется на устройстве со своими значениями', async () => {
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    expect(screen.getByText('Это устройство')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Среднее/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Высокое/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Низкое/ }));

    expect(stored()).toEqual({
      graphicsPreset: 'low',
      ...GRAPHICS_PRESET_VALUES.low,
    });
    expect(screen.getByRole('radio', { name: /Низкое/ })).toBeChecked();
    // На сервер графика больше не уходит.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('настройка по одной переключает набор на «Своё» и хранит все значения', async () => {
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    await user.click(screen.getByText('Только отряд'));

    expect(stored()).toEqual({
      graphicsPreset: 'custom',
      ...GRAPHICS_PRESET_VALUES.medium,
      creatureModels: 'party',
    });
    expect(screen.getByRole('radio', { name: /Своё/ })).toBeChecked();
  });

  it('сглаживание — переключатель; «Своё» начинается с того, что видно', async () => {
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    expect(
      screen.getByRole('switch', { name: /Сглаживание краёв/ }),
    ).toBeChecked();
    await user.click(screen.getByRole('switch', { name: /Сглаживание краёв/ }));

    expect(stored()).toEqual({
      graphicsPreset: 'custom',
      ...GRAPHICS_PRESET_VALUES.medium,
      antialias: false,
    });
  });

  it('ползунок анимаций сохраняет, когда его отпустили', async () => {
    renderWithProviders(<GraphicsSection />, { auth: { user: me } });
    const user = userEvent.setup();

    const slider = screen.getByRole('slider', { name: 'Частота анимаций' });
    expect(slider).toHaveAttribute('aria-valuenow', '18');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(stored()).toMatchObject({
      graphicsPreset: 'custom',
      animationFps: 19,
    });
  });

  it('без своей графики устройство начинает с сохранённой в аккаунте', () => {
    const account = {
      ...DEFAULT_USER_SETTINGS,
      graphicsPreset: 'custom' as const,
      creatureModels: 'none' as const,
    };
    renderWithProviders(<GraphicsSection />, {
      auth: { user: { ...me, settings: account } },
    });
    expect(screen.getByRole('radio', { name: /Своё/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Карточки' })).toBeChecked();
  });
});
