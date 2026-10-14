import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, type RenderOptions } from '../../test/render';
import RequireAuth from './RequireAuth';

function LoginProbe() {
  const location = useLocation();
  return <p>Страница входа{location.search}</p>;
}

function renderProtectedRoute(
  auth: RenderOptions['auth'],
  route = '/characters',
) {
  return renderWithProviders(
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/characters" element={<p>Мои персонажи</p>} />
      </Route>
      <Route path="/login" element={<LoginProbe />} />
    </Routes>,
    { route, auth },
  );
}

describe('RequireAuth', () => {
  it('пока сессия проверяется — не редиректит и не показывает страницу', () => {
    renderProtectedRoute({ loading: true });
    expect(screen.queryByText('Мои персонажи')).not.toBeInTheDocument();
    expect(screen.queryByText('Страница входа')).not.toBeInTheDocument();
  });

  it('гостя отправляет на /login, запомнив страницу', () => {
    renderProtectedRoute({ user: null }, '/characters?x=1');
    expect(
      screen.getByText('Страница входа?next=%2Fcharacters%3Fx%3D1'),
    ).toBeInTheDocument();
  });

  it('вошедшему показывает защищённую страницу', () => {
    renderProtectedRoute({
      user: { id: '1', login: 'hero', nickname: 'Hero' },
    });
    expect(screen.getByText('Мои персонажи')).toBeInTheDocument();
  });
});
