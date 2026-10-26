import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, resetChunkReloadForTests } from '../../lib/chunkReload';
import { theme } from '../../theme';
import RouteError from './RouteError';

function renderThrowing(error: Error) {
  function Broken(): never {
    throw error;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/monsters/1',
        element: <Broken />,
        errorElement: <RouteError />,
      },
    ],
    { initialEntries: ['/monsters/1'] },
  );
  return render(
    <MantineProvider theme={theme} env="test">
      <RouterProvider router={router} />
    </MantineProvider>,
  );
}

const chunkError = new TypeError(
  'Failed to fetch dynamically imported module: https://x/assets/MonsterModelPreview-C4xEdi6c.js',
);

describe('RouteError', () => {
  let reload: ReturnType<typeof vi.fn<() => void>>;
  beforeEach(() => {
    window.sessionStorage.clear();
    resetChunkReloadForTests();
    reload = vi.fn<() => void>();
    vi.spyOn(page, 'reload').mockImplementation(reload);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => resetChunkReloadForTests());

  it('при ошибке загрузки куска сайта сама перезагружает страницу', () => {
    renderThrowing(chunkError);
    expect(
      screen.getByText('Загружаем новую версию сайта…'),
    ).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('если перезагрузка только что была, просит обновить вручную', async () => {
    window.sessionStorage.setItem('dnd:chunk-reload-at', String(Date.now()));
    renderThrowing(chunkError);
    expect(
      screen.getByText('Не удалось загрузить часть сайта'),
    ).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Обновить страницу' }),
    );
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('при другой ошибке показывает её текст и не перезагружает', async () => {
    renderThrowing(
      new TypeError("Cannot read properties of undefined (reading 'hp')"),
    );
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Текст ошибки' }));
    expect(
      screen.getByText(/reading 'hp'\)\s+Страница: \/monsters\/1/),
    ).toBeInTheDocument();
  });
});
