import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '../features/auth/AuthContext';
import { theme } from '../theme';

export interface RenderOptions {
  /** Стартовый URL для MemoryRouter (объект — если нужен navigate state). */
  route?: string | { pathname: string; state?: unknown };
  /** Переопределения AuthContext; по умолчанию — гость, загрузка завершена. */
  auth?: Partial<AuthContextValue>;
}

// Те же провайдеры, что в main.tsx, но MemoryRouter вместо браузерного роутера и
// подставной AuthContext вместо AuthProvider — тот сразу пошёл бы в сеть за /auth/me.
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', auth }: RenderOptions = {},
) {
  const authValue: AuthContextValue = {
    user: null,
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(() => Promise.resolve()),
    ...auth,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MantineProvider theme={theme}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </MantineProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper }), authValue };
}
