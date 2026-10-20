import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { renderWithProviders } from '../../test/render';
import ProfilePage from './ProfilePage';

const lolkaProfile = {
  login: null,
  nickname: 'Арвен',
  hasPassword: false,
  providers: ['lolka'],
};

// Подменяем только сеть: GET /profile и запрос формы отвечают по очереди.
function stubFetch(...responses: [number, unknown][]) {
  const fetchMock = vi.fn(() => {
    const [status, body] = responses.shift() ?? [500, {}];
    return Promise.resolve(
      status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), { status }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('ProfilePage', () => {
  it('аккаунт из лольки задаёт логин и пароль', async () => {
    const fetchMock = stubFetch(
      [200, lolkaProfile],
      [200, { ...lolkaProfile, login: 'arwen', hasPassword: true }],
    );
    const { authValue } = renderWithProviders(<ProfilePage />, {
      auth: {
        user: {
          id: 'u1',
          login: 'lolka_ab12cd34',
          nickname: 'Арвен',
          settings: DEFAULT_USER_SETTINGS,
        },
      },
    });
    const user = userEvent.setup();

    expect(await screen.findByText('подключён')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Логин' }), 'arwen');
    await user.type(screen.getByLabelText(/^Пароль/), 'secret123');
    await user.type(screen.getByLabelText(/^Повторите пароль/), 'secret123');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить логин и пароль' }),
    );

    expect(await screen.findByText('arwen')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Сменить пароль' }),
    ).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/profile\/credentials$/);
    expect(JSON.parse(init.body as string)).toEqual({
      login: 'arwen',
      password: 'secret123',
    });
    expect(authValue.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ login: 'arwen' }),
    );
  });

  it('показывает ошибку сервера, если логин занят', async () => {
    stubFetch(
      [200, lolkaProfile],
      [409, { statusCode: 409, message: 'Этот логин уже занят' }],
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<ProfilePage />);
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole('textbox', { name: 'Логин' }),
      'taken',
    );
    await user.type(screen.getByLabelText(/^Пароль/), 'secret123');
    await user.type(screen.getByLabelText(/^Повторите пароль/), 'secret123');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить логин и пароль' }),
    );

    expect(await screen.findByText('Этот логин уже занят')).toBeInTheDocument();
  });

  it('аккаунт с паролем меняет пароль', async () => {
    stubFetch(
      [
        200,
        { login: 'hero', nickname: 'Hero', hasPassword: true, providers: [] },
      ],
      [204, null],
    );
    renderWithProviders(<ProfilePage />);
    const user = userEvent.setup();

    expect(await screen.findByText('hero')).toBeInTheDocument();
    expect(screen.queryByText('Вход через лольку:')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Текущий пароль/), 'old-pass');
    await user.type(screen.getByLabelText(/^Новый пароль/), 'new-pass');
    await user.type(screen.getByLabelText(/^Повторите новый/), 'new-pass');
    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));

    expect(await screen.findByText('Пароль изменён.')).toBeInTheDocument();
  });
});
