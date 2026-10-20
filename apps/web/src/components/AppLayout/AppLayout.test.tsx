import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { renderWithProviders } from '../../test/render';
import AppLayout from './AppLayout';

const user = {
  id: 'u1',
  login: 'hero',
  nickname: 'Герой',
  settings: DEFAULT_USER_SETTINGS,
};

function navbar() {
  return within(screen.getByRole('navigation', { name: 'Разделы' }));
}

// Общая заглушка matchMedia отвечает «нет» на всё, то есть «телефон», а сворачивание
// до иконок — только на широком экране.
const narrowMatchMedia = window.matchMedia.bind(window);
beforeEach(() => {
  window.matchMedia = vi.fn((query: string) => ({
    ...narrowMatchMedia(query),
    matches: query.includes('min-width'),
  }));
});

afterEach(() => {
  window.matchMedia = narrowMatchMedia;
  localStorage.clear();
});

describe('AppLayout', () => {
  it('разделы — в боковой панели, текущий подсвечен и на вложенной странице', () => {
    renderWithProviders(<AppLayout />, {
      route: '/characters/123/edit',
      auth: { user },
    });

    const nav = navbar();
    for (const label of [
      'Игры',
      'Персонажи',
      'Карты',
      'Предметы',
      'Монстры',
      'Закладки',
    ]) {
      expect(nav.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(nav.getByText('Справочник')).toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Персонажи' })).toHaveAttribute(
      'data-active',
    );
    expect(nav.getByRole('link', { name: 'Игры' })).not.toHaveAttribute(
      'data-active',
    );
  });

  it('сворачивается до иконок и запоминает это', async () => {
    renderWithProviders(<AppLayout />, { route: '/games', auth: { user } });
    const u = userEvent.setup();

    await u.click(navbar().getByRole('button', { name: 'Свернуть меню' }));

    // Подписи пропали, ссылки остались — по aria-label и подсказке.
    expect(navbar().queryByText('Справочник')).not.toBeInTheDocument();
    expect(navbar().getByRole('link', { name: 'Карты' })).toBeInTheDocument();
    expect(
      navbar().getByRole('button', { name: 'Развернуть меню' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('dnd-navbar-collapsed')).toBe('true');
  });

  it('на странице карты панель свёрнута сама, выбор на других страницах не меняется', () => {
    renderWithProviders(<AppLayout />, { route: '/maps/abc', auth: { user } });

    expect(
      navbar().getByRole('button', { name: 'Развернуть меню' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('dnd-navbar-collapsed')).not.toBe('true');
  });

  it('профиль и выход — в меню под ником', async () => {
    const { authValue } = renderWithProviders(<AppLayout />, {
      route: '/games',
      auth: { user },
    });
    const u = userEvent.setup();

    await u.click(screen.getByRole('button', { name: 'Герой' }));
    expect(
      await screen.findByRole('menuitem', { name: 'Профиль' }),
    ).toHaveAttribute('href', '/profile');
    await u.click(screen.getByRole('menuitem', { name: 'Выйти' }));
    expect(authValue.logout).toHaveBeenCalled();
  });

  it('гостю — вход и регистрация, без панели', () => {
    renderWithProviders(<AppLayout />, { route: '/login' });

    expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Разделы' }),
    ).not.toBeInTheDocument();
  });
});
