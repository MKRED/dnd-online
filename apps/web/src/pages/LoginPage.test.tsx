import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import LoginPage from './LoginPage';

// Подменяем только сеть: authApi и разбор ошибок работают настоящие.
// /auth/providers отвечает отдельно — его спрашивает кнопка лольки.
function stubFetch(
  status: number,
  body: unknown,
  providers = { lolka: false },
) {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      url.endsWith('/auth/providers')
        ? new Response(JSON.stringify(providers))
        : new Response(JSON.stringify(body), { status }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function loginCalls(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/login'));
}

function renderLoginPage(route = '/login') {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Главная</p>} />
    </Routes>,
    { route },
  );
}

async function submitCredentials(login: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Логин' }), login);
  await user.type(screen.getByLabelText(/Пароль/), password);
  await user.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('LoginPage', () => {
  it('не ходит в сеть, пока форма невалидна', async () => {
    const fetchMock = stubFetch(200, {});
    renderLoginPage();

    await submitCredentials('ab', '123');

    expect(screen.getByText('Минимум 3 символа')).toBeInTheDocument();
    expect(loginCalls(fetchMock)).toHaveLength(0);
  });

  it('после входа сохраняет пользователя и уходит на главную', async () => {
    const user = { id: '1', login: 'hero', nickname: 'Hero' };
    stubFetch(200, { user });
    const { authValue } = renderLoginPage();

    await submitCredentials('hero', 'secret123');

    expect(await screen.findByText('Главная')).toBeInTheDocument();
    expect(authValue.setUser).toHaveBeenCalledWith(user);
  });

  it('показывает сообщение сервера при ошибке (например, rate limit)', async () => {
    stubFetch(429, {
      statusCode: 429,
      message: 'Слишком много попыток, попробуйте позже',
    });
    // LoginPage логирует ошибку в console.error — в выводе тестов это шум.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderLoginPage();

    await submitCredentials('hero', 'secret123');

    expect(
      await screen.findByText('Слишком много попыток, попробуйте позже'),
    ).toBeInTheDocument();
  });

  it('показывает кнопку лольки, только если вход через неё включён', async () => {
    stubFetch(200, {}, { lolka: true });
    renderLoginPage();

    const link = await screen.findByRole('link', {
      name: 'Войти через лольку',
    });
    expect(link.getAttribute('href')).toMatch(/\/auth\/lolka\/start$/);
  });

  it('не показывает кнопку лольки, если она выключена', async () => {
    const fetchMock = stubFetch(200, {});
    renderLoginPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.queryByRole('link', { name: 'Войти через лольку' }),
    ).not.toBeInTheDocument();
  });

  it('показывает, почему не удался вход через лольку', async () => {
    stubFetch(200, {});
    renderLoginPage('/login?lolkaError=denied');

    expect(
      await screen.findByText('Вход через лольку отменён.'),
    ).toBeInTheDocument();
  });
});
