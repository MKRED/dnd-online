import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import ApiTokensCard from './ApiTokensCard';

const existing = {
  id: 't1',
  name: 'Ноутбук',
  prefix: 'dnd_abcd1234',
  createdAt: '2026-10-01T10:00:00.000Z',
  lastUsedAt: null,
};

// Ответы по очереди: список токенов, затем запрос действия.
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ApiTokensCard', () => {
  it('пустой список, затем созданный токен показывается один раз и встаёт в список', async () => {
    const created = { ...existing, id: 't2', name: 'Claude Code' };
    stubFetch([200, []], [201, { token: 'dnd_secret', info: created }]);
    renderWithProviders(<ApiTokensCard />);
    const user = userEvent.setup();

    expect(await screen.findByText('Токенов пока нет.')).toBeInTheDocument();
    const create = screen.getByRole('button', { name: 'Создать' });
    expect(create).toBeDisabled();
    await user.type(
      screen.getByRole('textbox', { name: 'Новый токен' }),
      'Claude Code',
    );
    await user.click(create);

    expect(await screen.findByText('dnd_secret')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.queryByText('Токенов пока нет.')).not.toBeInTheDocument();
  });

  it('отзывает токен после подтверждения', async () => {
    const fetchMock = stubFetch([200, [existing]], [204, null]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<ApiTokensCard />);
    const user = userEvent.setup();

    expect(await screen.findByText('Ноутбук')).toBeInTheDocument();
    expect(screen.getByText(/ещё не использовался/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отозвать' }));

    expect(confirm).toHaveBeenCalled();
    expect(await screen.findByText('Токенов пока нет.')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/api-tokens\/t1$/);
    expect(init.method).toBe('DELETE');
  });

  it('без подтверждения не отзывает', async () => {
    const fetchMock = stubFetch([200, [existing]]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(<ApiTokensCard />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Отозвать' }));

    expect(screen.getByText('Ноутбук')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('показывает ошибку загрузки', async () => {
    stubFetch([500, { statusCode: 500, message: 'Сервер упал' }]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<ApiTokensCard />);

    expect(await screen.findByText('Ошибка')).toBeInTheDocument();
  });
});
