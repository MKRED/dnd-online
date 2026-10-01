import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, type RenderOptions } from '../../test/render';
import RequireAuth from './RequireAuth';

function renderProtectedRoute(auth: RenderOptions['auth']) {
  return renderWithProviders(
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/characters" element={<p>Мои персонажи</p>} />
      </Route>
      <Route path="/login" element={<p>Страница входа</p>} />
    </Routes>,
    { route: '/characters', auth },
  );
}

describe('RequireAuth', () => {
  it('пока сессия проверяется — не редиректит и не показывает страницу', () => {
    renderProtectedRoute({ loading: true });
    expect(screen.queryByText('Мои персонажи')).not.toBeInTheDocument();
    expect(screen.queryByText('Страница входа')).not.toBeInTheDocument();
  });

  it('гостя отправляет на /login', () => {
    renderProtectedRoute({ user: null });
    expect(screen.getByText('Страница входа')).toBeInTheDocument();
  });

  it('вошедшему показывает защищённую страницу', () => {
    renderProtectedRoute({
      user: { id: '1', login: 'hero', nickname: 'Hero' },
    });
    expect(screen.getByText('Мои персонажи')).toBeInTheDocument();
  });
});
