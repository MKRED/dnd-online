import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameDetail } from 'shared';
import { createFakeGameSocket } from '../../test/fakeGameSocket';
import { sampleCharacter } from '../../test/characterFixture';
import { body, GAME, renderLobby, stubFetch, urlOf } from './lobbyTestKit';

// Сокет — поддельный: тесты страницы не ходят в сеть.
const socket = vi.hoisted(() => ({
  current: null as ReturnType<typeof createFakeGameSocket> | null,
}));
vi.mock('../../features/games/gameSocket', () => ({
  acquireGameSocket: () => socket.current,
  releaseGameSocket: () => undefined,
}));
socket.current = createFakeGameSocket();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GameLobbyPage', () => {
  it('закрытое лобби спрашивает пароль и после него показывает места', async () => {
    const fetchMock = stubFetch([
      {
        status: 403,
        body: { statusCode: 403, message: 'Игра закрыта паролем' },
      },
      { status: 200, body: GAME },
    ]);
    renderLobby();
    const user = userEvent.setup();

    expect(await screen.findByText('Игра закрыта паролем')).toBeInTheDocument();
    expect(screen.queryByText('Лира')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Пароль игры'), 'секрет');
    await user.click(screen.getByRole('button', { name: 'Войти в лобби' }));

    expect(await screen.findByText('Лира')).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/games\/.+\/enter$/);
    expect(body(fetchMock.mock.calls[1])).toEqual({ password: 'секрет' });
    expect(screen.getByText('Игрок: Аня')).toBeInTheDocument();
    expect(screen.getByText('Управление не передаётся')).toBeInTheDocument();
    // Одно место занято, два свободны — каждое можно занять.
    expect(screen.getAllByText('Свободное место')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Занять' })).toHaveLength(2);
  });

  it('игрок занимает место своим игровым персонажем', async () => {
    const npc = {
      ...sampleCharacter,
      id: 'npc',
      name: 'Трактирщик',
      kind: 'npc',
    };
    const seated: GameDetail = {
      ...GAME,
      role: 'player',
      takenSeats: 2,
      seats: [
        ...GAME.seats,
        {
          user: { id: 'u1', nickname: 'Я' },
          character: {
            id: sampleCharacter.id,
            name: sampleCharacter.name,
            species: sampleCharacter.species,
            classes: sampleCharacter.classes,
          },
          allowHandover: true,
          controller: null,
          seatedAt: '2026-10-20T01:00:00.000Z',
        },
      ],
    };
    const fetchMock = stubFetch([
      { status: 200, body: GAME },
      { status: 200, body: [sampleCharacter, npc] },
      { status: 201, body: seated },
    ]);
    renderLobby();
    const user = userEvent.setup();

    await user.click(
      (await screen.findAllByRole('button', { name: 'Занять' }))[0],
    );
    const dialog = await screen.findByRole('dialog', { name: 'Занять место' });
    // Единственный игровой персонаж выбран сразу, НПС в списке нет.
    await user.click(within(dialog).getByRole('button', { name: 'Занять' }));

    expect(await screen.findByText('Вы играете')).toBeInTheDocument();
    expect(body(fetchMock.mock.calls[2])).toEqual({
      characterId: sampleCharacter.id,
      allowHandover: true,
    });
    expect(
      screen.getByRole('switch', { name: 'Можно передать управление' }),
    ).toBeChecked();
    expect(
      screen.queryByRole('button', { name: 'Занять' }),
    ).not.toBeInTheDocument();
  });

  it('мастер видит «Убрать из игры» и «Удалить игру», занять место не может', async () => {
    stubFetch([{ status: 200, body: { ...GAME, role: 'master' } }]);
    renderLobby('m1');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('button', { name: 'Убрать из игры' }),
    ).toBeInTheDocument();
    // «Удалить игру» — в меню, подальше от частых кнопок.
    await user.click(screen.getByRole('button', { name: 'Ещё действия' }));
    expect(
      await screen.findByRole('menuitem', { name: 'Удалить игру' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Занять' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Выйти из игры' }),
    ).not.toBeInTheDocument();
  });

  it('мастер отдаёт управление персонажем участнику; остальные видят, кто управляет', async () => {
    const seat = { ...GAME.seats[0], allowHandover: true };
    const boris = { id: 'u3', nickname: 'Борис' };
    const masterGame: GameDetail = {
      ...GAME,
      role: 'master',
      seats: [seat],
      members: [seat.user, boris],
    };
    const given: GameDetail = {
      ...masterGame,
      seats: [{ ...seat, controller: boris }],
    };
    const fetchMock = stubFetch([
      { status: 200, body: masterGame },
      { status: 200, body: given },
    ]);
    // Список вариантов Select прокручивает к выбранному; в jsdom прокрутки нет.
    Element.prototype.scrollIntoView = vi.fn();
    renderLobby('m1');
    const user = userEvent.setup();

    const select = await screen.findByRole('combobox', { name: 'Управляет' });
    expect(select).toHaveValue('Владелец (Аня)');
    await user.click(select);
    // Владельца среди кандидатов нет — только он сам как «Владелец».
    expect(
      screen.queryByRole('option', { name: 'Аня' }),
    ).not.toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: 'Борис' }));
    await waitFor(() => expect(select).toHaveValue('Борис'));
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(urlOf(put?.[0] as RequestInfo)).toMatch(/\/seats\/u2\/controller$/);
    expect(body(put as unknown[])).toEqual({ controllerId: 'u3' });
  });

  it('без разрешения владельца выбора нет; управляющего видят все', async () => {
    stubFetch([
      {
        status: 200,
        body: {
          ...GAME,
          seats: [
            {
              ...GAME.seats[0],
              allowHandover: true,
              controller: { id: 'u3', nickname: 'Борис' },
            },
          ],
        },
      },
    ]);
    renderLobby('u1');
    expect(await screen.findByText('Управляет: Борис')).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Управляет' }),
    ).not.toBeInTheDocument();
  });

  it('мастер начинает и заканчивает встречу', async () => {
    const started = {
      ...GAME,
      role: 'master',
      sessionStartedAt: '2026-10-20T10:00:00.000Z',
    };
    const fetchMock = stubFetch([
      { status: 200, body: { ...GAME, role: 'master' } },
      { status: 201, body: started },
      { status: 200, body: { ...started, sessionStartedAt: null } },
    ]);
    renderLobby('m1');
    const user = userEvent.setup();

    expect(screen.queryByText('Идёт встреча')).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Начать встречу' }),
    );
    expect(await screen.findByText('Идёт встреча')).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/games\/[^/]+\/session$/);
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');

    await user.click(screen.getByRole('button', { name: 'Закончить встречу' }));
    expect(
      await screen.findByRole('button', { name: 'Начать встречу' }),
    ).toBeInTheDocument();
    expect((fetchMock.mock.calls[2][1] as RequestInit).method).toBe('DELETE');
    expect(screen.queryByText('Идёт встреча')).not.toBeInTheDocument();
  });

  it('игрок на месте видит, что идёт встреча и лист закрыт', async () => {
    stubFetch([
      {
        status: 200,
        body: {
          ...GAME,
          role: 'player',
          sessionStartedAt: '2026-10-20T10:00:00.000Z',
        },
      },
    ]);
    renderLobby('u2');

    expect(await screen.findByText('Идёт встреча')).toBeInTheDocument();
    expect(
      screen.getByText(/лист вашего персонажа закрыт для правки/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Начать встречу' }),
    ).not.toBeInTheDocument();
  });

  it('мастер открывает журнал, раскрывает запись и подгружает старые', async () => {
    const event = (seq: number, nickname: string) => ({
      seq,
      kind: 'member.entered',
      actor: { id: `u${seq}`, nickname },
      as: null,
      sceneId: null,
      intent: null,
      result: null,
      createdAt: '2026-10-20T10:00:00.000Z',
    });
    const fetchMock = stubFetch([
      { status: 200, body: { ...GAME, role: 'master' } },
      {
        status: 200,
        body: {
          events: [
            {
              ...event(3, 'Аня'),
              kind: 'seat.taken',
              intent: { characterId: 'c2', allowHandover: false },
              result: { character: { id: 'c2', name: 'Лира' } },
            },
            event(2, 'Аня'),
          ],
          hasMore: true,
        },
      },
      {
        status: 200,
        body: {
          events: [
            {
              ...event(1, 'Мастер'),
              kind: 'game.created',
              as: { kind: 'master' },
              intent: { name: 'Подземелье', seatCount: 3, hasPassword: true },
            },
          ],
          hasMore: false,
        },
      },
    ]);
    renderLobby('m1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Журнал' }));
    const drawer = await screen.findByRole('dialog', { name: 'Журнал игры' });
    expect(
      await within(drawer).findByText('Место занято: Лира'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/games\/[^/]+\/events$/);

    // Раскрытая запись показывает номер, вид и данные как есть.
    await user.click(within(drawer).getByText('Место занято: Лира'));
    expect(within(drawer).getByText('№ 3 · seat.taken')).toBeInTheDocument();
    // Панель аккордеона в DOM и закрытой, поэтому раскрытие — по aria-expanded.
    expect(
      within(drawer).getByRole('button', { name: /Место занято: Лира/ }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(drawer).getByText(/"allowHandover": false/),
    ).toBeInTheDocument();

    await user.click(
      within(drawer).getByRole('button', { name: 'Показать ещё' }),
    );
    expect(
      await within(drawer).findByText(
        'Игра «Подземелье» создана: мест 3, с паролем',
      ),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/events\?before=2$/);
    expect(
      within(drawer).queryByRole('button', { name: 'Показать ещё' }),
    ).not.toBeInTheDocument();
  });

  it('у игрока журнала нет', async () => {
    stubFetch([{ status: 200, body: { ...GAME, role: 'player' } }]);
    renderLobby('u2');

    expect(
      await screen.findByRole('button', { name: 'Выйти из игры' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Журнал' }),
    ).not.toBeInTheDocument();
  });
});
