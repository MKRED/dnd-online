import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import type { Profile } from '../../../features/profile';
import { renderWithProviders } from '../../../test/render';
import AccountSection from './AccountSection';

const lolkaProfile: Profile = {
  login: null,
  nickname: 'Арвен',
  hasPassword: false,
  providers: ['lolka'],
  createdAt: '2026-09-14T10:00:00.000Z',
};
const passwordProfile: Profile = {
  login: 'hero',
  nickname: 'Hero',
  hasPassword: true,
  providers: [],
  createdAt: '2026-09-14T10:00:00.000Z',
};
const authUser = {
  id: 'u1',
  login: 'hero',
  nickname: 'Hero',
  settings: DEFAULT_USER_SETTINGS,
};

// Подменяем только сеть: запросы отвечают по очереди.
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

const requestOf = (fetchMock: ReturnType<typeof stubFetch>, index: number) => {
  const [url, init] = fetchMock.mock.calls[index] as unknown as [
    string,
    RequestInit,
  ];
  return { url, body: JSON.parse(init.body as string) as unknown };
};

// Профиль хранит страница; здесь — как она: раздел получает его и сообщает о смене.
function renderSection(initial: Profile) {
  const onChange = vi.fn();
  function Harness() {
    const [profile, setProfile] = useState(initial);
    return (
      <AccountSection
        profile={profile}
        onChange={(next) => {
          onChange(next);
          setProfile(next);
        }}
      />
    );
  }
  const rendered = renderWithProviders(<Harness />, {
    auth: { user: authUser },
  });
  return { ...rendered, onChange };
}

describe('AccountSection', () => {
  it('ник меняется в строке, Enter сохраняет, шапка получает новый', async () => {
    const fetchMock = stubFetch([
      200,
      { ...passwordProfile, nickname: 'mk red' },
    ]);
    const { authValue, onChange } = renderSection(passwordProfile);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Изменить' }));
    const input = screen.getByRole('textbox', { name: 'Ник' });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, '  mk   red {Enter}');

    expect(await screen.findByText('Ник изменён')).toBeInTheDocument();
    expect(screen.getByText('mk red')).toBeInTheDocument();
    const { url, body } = requestOf(fetchMock, 0);
    expect(url).toMatch(/\/profile\/nickname$/);
    expect(body).toEqual({ nickname: '  mk   red ' });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: 'mk red' }),
    );
    expect(authValue.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: 'mk red' }),
    );
  });

  it('короткий ник не уходит на сервер, Esc закрывает поле без изменений', async () => {
    const fetchMock = stubFetch();
    renderSection(passwordProfile);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Изменить' }));
    const input = screen.getByRole('textbox', { name: 'Ник' });
    await user.clear(input);
    await user.type(input, 'a');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByText('Ник — от 2 до 32 знаков')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();
    // Фокус возвращается на следующем кадре, когда кнопка снова в разметке.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Изменить' })).toHaveFocus(),
    );
  });

  it('ошибка сервера остаётся под полем', async () => {
    stubFetch([400, { statusCode: 400, message: ['Ник — от 2 до 32 знаков'] }]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSection(passwordProfile);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Изменить' }));
    await user.type(screen.getByRole('textbox', { name: 'Ник' }), '!{Enter}');
    expect(
      await screen.findByText('Ник — от 2 до 32 знаков'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Ник' })).toBeInTheDocument();
  });

  it('аккаунт из лольки задаёт логин и пароль', async () => {
    const fetchMock = stubFetch([
      200,
      { ...lolkaProfile, login: 'arwen', hasPassword: true },
    ]);
    const { authValue } = renderSection(lolkaProfile);
    const user = userEvent.setup();

    expect(screen.getByText('Подключена')).toBeInTheDocument();
    expect(screen.getByText('Не заданы')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Задать' }));
    await user.type(screen.getByRole('textbox', { name: 'Логин' }), 'arwen');
    await user.type(screen.getByLabelText(/^Пароль/), 'secret123');
    await user.type(screen.getByLabelText(/^Повторите пароль/), 'secret123');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить логин и пароль' }),
    );

    expect(
      await screen.findByText('Логин и пароль сохранены'),
    ).toBeInTheDocument();
    expect(screen.getByText('arwen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сменить' })).toBeInTheDocument();
    const { url, body } = requestOf(fetchMock, 0);
    expect(url).toMatch(/\/profile\/credentials$/);
    expect(body).toEqual({ login: 'arwen', password: 'secret123' });
    expect(authValue.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ login: 'arwen' }),
    );
  });

  it('показывает ошибку сервера, если логин занят', async () => {
    stubFetch([409, { statusCode: 409, message: 'Этот логин уже занят' }]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSection(lolkaProfile);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Задать' }));
    await user.type(screen.getByRole('textbox', { name: 'Логин' }), 'taken');
    await user.type(screen.getByLabelText(/^Пароль/), 'secret123');
    await user.type(screen.getByLabelText(/^Повторите пароль/), 'secret123');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить логин и пароль' }),
    );

    expect(await screen.findByText('Этот логин уже занят')).toBeInTheDocument();
  });

  it('аккаунт с паролем меняет пароль в раскрытой строке', async () => {
    stubFetch([204, null]);
    renderSection(passwordProfile);
    const user = userEvent.setup();

    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.getByText('Не подключена')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сменить' }));
    await user.type(screen.getByLabelText(/^Текущий пароль/), 'old-pass');
    await user.type(screen.getByLabelText(/^Новый пароль/), 'new-pass');
    await user.type(screen.getByLabelText(/^Повторите новый/), 'new-pass');
    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));

    expect(await screen.findByText('Пароль изменён')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Текущий пароль/)).not.toBeInTheDocument();
  });
});
