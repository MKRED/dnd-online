import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import ProfilePage from './ProfilePage';

// У разделов свои запросы и свои тесты; здесь — только раскладка по разделам.
vi.mock('./account/AccountSection', () => ({
  default: () => <p>тело аккаунта</p>,
}));
vi.mock('./map/MapSection', () => ({ default: () => <p>тело карты</p> }));
vi.mock('./graphics/GraphicsSection', () => ({ default: () => null }));
vi.mock('./ai/ApiTokensCard', () => ({ default: () => null }));
vi.mock('./useProfile', () => ({
  useProfile: () => ({
    profile: {
      login: 'hero',
      nickname: 'mk red',
      hasPassword: true,
      providers: [],
      createdAt: '2026-09-14T10:00:00.000Z',
    },
    error: null,
    setProfile: vi.fn(),
  }),
}));

// В тестах matchMedia ничему не отвечает «да» — это узкий экран (test/setup.ts).
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:section" element={<ProfilePage />} />
    </Routes>,
    { route },
  );
}

describe('ProfilePage на узком экране', () => {
  it('/profile — список разделов, раздел открывается отдельным экраном и ведёт назад', async () => {
    renderAt('/profile');
    const user = userEvent.setup();

    expect(screen.getByText('mk red')).toBeInTheDocument();
    expect(screen.getByText('hero · с сентября 2026')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Разделы профиля' });
    expect(nav).toHaveTextContent('Аккаунт');
    expect(nav).toHaveTextContent('Нейросеть');
    expect(screen.queryByText('тело аккаунта')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Карта и игра/ }));
    expect(screen.getByText('тело карты')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Карта и игра' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Профиль' }));
    expect(
      screen.getByRole('navigation', { name: 'Разделы профиля' }),
    ).toBeInTheDocument();
  });

  it('неизвестный раздел ведёт к списку', () => {
    renderAt('/profile/nope');
    expect(
      screen.getByRole('navigation', { name: 'Разделы профиля' }),
    ).toBeInTheDocument();
  });
});
