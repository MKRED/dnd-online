import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameLibraryEntry, GameLibraryItem, Item } from 'shared';
import { createFakeGameSocket } from '../../test/fakeGameSocket';
import { GAME, renderLobby, stubFetch } from './lobbyTestKit';

// Библиотека игры у мастера (docs/plan/done/game.md, этап 4). Сокет — поддельный.
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

const row = (
  kind: GameLibraryItem['kind'],
  sourceId: string,
  name: string,
  category: string,
  source: GameLibraryItem['source'] = 'same',
): GameLibraryItem => ({
  kind,
  sourceId,
  name,
  category,
  image: null,
  copiedAt: '2026-10-20T10:00:00.000Z',
  refreshedAt: null,
  source,
});

const item = (id: string, name: string, over: Partial<Item> = {}): Item =>
  ({
    id,
    authorId: '',
    authorNickname: 'Аня',
    isPublic: true,
    name,
    category: 'basic',
    details: {},
    rarity: 'none',
    weight: 1,
    cost: null,
    description: '',
    sources: [],
    image: null,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...over,
  }) as Item;

const LIST = [
  row('item', 'p1', 'Набор', 'pack', 'changed'),
  row('effect', 'e1', 'Ожог', 'basic', 'missing'),
  row('item', 'l1', 'Фонарь', 'basic'),
];
const PACK: GameLibraryEntry = {
  ...LIST[0],
  kind: 'item',
  record: item('p1', 'Набор', {
    category: 'pack',
    details: {
      contents: [
        {
          itemId: 'l1',
          quantity: 2,
          item: {
            name: 'Фонарь',
            category: 'basic',
            weight: 1,
            isPublic: true,
            image: null,
          },
        },
        { itemId: 'gone', quantity: 1, item: null },
      ],
    },
  }),
};
const LANTERN: GameLibraryEntry = {
  ...LIST[2],
  kind: 'item',
  record: item('l1', 'Фонарь', { description: 'Светит на 30 фт.' }),
};

describe('GameLobbyPage: библиотека игры', () => {
  it('мастер ищет в библиотеке, открывает копию и её связь', async () => {
    const fetchMock = stubFetch(
      [
        { status: 200, body: { ...GAME, role: 'master' } },
        { status: 200, body: LIST },
        { status: 200, body: LIST },
        { status: 200, body: PACK },
        { status: 200, body: LANTERN },
      ],
      { libraryInQueue: true },
    );
    renderLobby('m1');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', {
        name: 'Библиотека, ждут обновления: 1',
      }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: 'Библиотека игры',
    });
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/games\/[^/]+\/library$/);
    await within(drawer).findByText('Набор');
    // Сверка со справочником: «Обновить» — только у изменённой копии.
    expect(
      within(drawer).getByText('Изменена в справочнике'),
    ).toBeInTheDocument();
    expect(within(drawer).getByText('Нет в справочнике')).toBeInTheDocument();
    expect(
      within(drawer).getAllByRole('button', { name: 'Обновить' }),
    ).toHaveLength(1);

    await user.click(within(drawer).getByRole('radio', { name: 'Эффекты 1' }));
    expect(within(drawer).queryByText('Набор')).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('radio', { name: 'Все 3' }));
    await user.type(within(drawer).getByRole('textbox'), 'фон');
    expect(within(drawer).queryByText('Набор')).not.toBeInTheDocument();
    await user.clear(within(drawer).getByRole('textbox'));

    await user.click(
      within(drawer).getByRole('button', { name: 'Открыть: Набор' }),
    );
    expect(
      await within(drawer).findByText('Предмет · Набор снаряжения · автор Аня'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[3][0]).toMatch(/\/library\/item\/p1$/);
    expect(within(drawer).getByText('Скрыто или удалено')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Фонарь' }));
    expect(
      await within(drawer).findByText('Светит на 30 фт.'),
    ).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: '← Назад' }));
    await user.click(
      await within(drawer).findByRole('button', { name: '← К библиотеке' }),
    );
    expect(
      await within(drawer).findByRole('button', { name: 'Открыть: Ожог' }),
    ).toBeInTheDocument();
  });

  it('«Обновить» переписывает копию из справочника и перечитывает список', async () => {
    const refreshed = { ...PACK, name: 'Новый набор', source: 'same' };
    const fetchMock = stubFetch(
      [
        { status: 200, body: { ...GAME, role: 'master' } },
        { status: 200, body: LIST },
        { status: 200, body: LIST },
        { status: 201, body: refreshed },
        {
          status: 200,
          body: [{ ...LIST[0], name: 'Новый набор', source: 'same' }],
        },
      ],
      { libraryInQueue: true },
    );
    renderLobby('m1');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', {
        name: 'Библиотека, ждут обновления: 1',
      }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: 'Библиотека игры',
    });
    await user.click(
      await within(drawer).findByRole('button', { name: 'Обновить' }),
    );
    expect(await within(drawer).findByText('Новый набор')).toBeInTheDocument();
    expect(fetchMock.mock.calls[3][0]).toMatch(/\/library\/item\/p1\/refresh$/);
    expect((fetchMock.mock.calls[3][1] as RequestInit).method).toBe('POST');
    expect(
      within(drawer).queryByRole('button', { name: 'Обновить' }),
    ).not.toBeInTheDocument();
  });

  it('на кнопке — сколько копий ждут обновления; пересчёт после шторки и на вкладке', async () => {
    const same = LIST.map((entry) => ({ ...entry, source: 'same' }));
    const twoChanged = [
      ...LIST,
      row('monster', 'g1', 'Гоблин', 'humanoid', 'changed'),
    ];
    const fetchMock = stubFetch(
      [
        { status: 200, body: { ...GAME, role: 'master' } },
        { status: 200, body: LIST },
        { status: 200, body: same },
        { status: 200, body: same },
        { status: 200, body: twoChanged },
      ],
      { libraryInQueue: true },
    );
    renderLobby('m1');
    const user = userEvent.setup();

    // «Нет в справочнике» не считается: обновить можно только изменённую.
    const button = await screen.findByRole('button', {
      name: 'Библиотека, ждут обновления: 1',
    });
    // Кружок Mantine стоит в обёртке кнопки перед ней.
    expect(button.parentElement).toHaveTextContent(/^1Библиотека$/);

    await user.click(button);
    const drawer = await screen.findByRole('dialog', {
      name: 'Библиотека игры',
    });
    await within(drawer).findByText('Набор');
    await user.click(
      within(drawer).getByRole('button', { name: 'Закрыть библиотеку' }),
    );
    // Закрытая шторка — повод пересчитать: обновлять больше нечего, кружка нет.
    const plain = await screen.findByRole('button', { name: 'Библиотека' });
    expect(plain.parentElement).toHaveTextContent(/^Библиотека$/);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Справочник поправили в другой вкладке — вернулись, число пересчиталось.
    fireEvent.focus(window);
    expect(
      await screen.findByRole('button', {
        name: 'Библиотека, ждут обновления: 2',
      }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  });
});
