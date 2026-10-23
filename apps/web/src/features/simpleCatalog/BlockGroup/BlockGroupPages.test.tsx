import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS, type BlockGroup } from 'shared';
import { renderWithProviders } from '../../../test/render';
import { SimpleCreatePage } from '../SimpleFormPage';
import SimpleViewPage from '../SimpleViewPage';
import { BLOCKS } from '../simpleCatalogs';

const AUTHOR = '11111111-1111-4111-8111-111111111111';

const embers: BlockGroup = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Тлеющие угли',
  description: '',
  sources: [],
  isPublic: false,
  image: null,
  authorId: AUTHOR,
  authorNickname: 'Мастер',
  createdAt: '2026-10-22T00:00:00.000Z',
  updatedAt: '2026-10-22T00:00:00.000Z',
  look: 'scorched',
  color: '#5a2a1a',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
  shapes: {},
};

const auth = {
  user: {
    id: AUTHOR,
    login: 'master',
    nickname: 'Мастер',
    settings: DEFAULT_USER_SETTINGS,
  },
};

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const fetchMock = vi.fn<typeof fetch>((url, init) =>
    Promise.resolve(
      new Response(JSON.stringify(handler(url as string, init) ?? null)),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('раздел «Блоки»', () => {
  it('карточка показывает свойства группы и её формы', async () => {
    stubFetch(() => embers);
    renderWithProviders(
      <Routes>
        <Route path="/blocks/:id" element={<SimpleViewPage def={BLOCKS} />} />
      </Routes>,
      { route: `/blocks/${embers.id}`, auth },
    );

    expect(
      await screen.findByRole('heading', { name: 'Тлеющие угли' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Выжженная земля')).toBeInTheDocument();
    expect(
      screen.getByText('Труднопроходимая местность: шаг стоит 10 футов'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Огонь: 4к10/)).toBeInTheDocument();
    expect(
      screen.getAllByRole('listitem', { hidden: true }).length,
    ).toBeGreaterThanOrEqual(6);
  });

  it('перед удалением называет карты, где стоят блоки группы', async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith('/usage')
        ? { maps: [{ id: 'm', name: 'Пещера' }], scenes: [] }
        : embers,
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(
      <Routes>
        <Route path="/blocks/:id" element={<SimpleViewPage def={BLOCKS} />} />
      </Routes>,
      { route: `/blocks/${embers.id}`, auth },
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Удалить' }),
    );

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0]).toContain('на картах: «Пещера»');
    expect(confirm.mock.calls[0][0]).toContain('станут пустотой');
    // Отказались — запроса на удаление нет, кнопка снова доступна.
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false);
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeEnabled();
  });

  it('создание отправляет вид и свойства группы', async () => {
    const fetchMock = stubFetch((_url, init) =>
      init?.method === 'POST' ? embers : [],
    );
    renderWithProviders(
      <Routes>
        <Route path="/blocks/new" element={<SimpleCreatePage def={BLOCKS} />} />
        <Route path="/blocks/:id" element={<p>Карточка</p>} />
      </Routes>,
      { route: '/blocks/new', auth },
    );

    await userEvent.type(
      await screen.findByLabelText(/Название/),
      'Тлеющие угли',
    );
    await userEvent.click(
      screen.getByRole('switch', { name: /Труднопроходимая местность/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    await screen.findByText('Карточка');
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      name: 'Тлеющие угли',
      look: 'stone',
      color: '#8a8a8a',
      movementCost: 2,
      durability: { armorClass: 17, hitPoints: 27 },
      hazard: null,
    });
  });

  it('своя текстура ступеней уходит в shapes, остальные формы — без неё', async () => {
    const fetchMock = stubFetch((_url, init) =>
      init?.method === 'POST' ? embers : [],
    );
    renderWithProviders(
      <Routes>
        <Route path="/blocks/new" element={<SimpleCreatePage def={BLOCKS} />} />
        <Route path="/blocks/:id" element={<p>Карточка</p>} />
      </Routes>,
      { route: '/blocks/new', auth },
    );

    await userEvent.type(await screen.findByLabelText(/Название/), 'Угли');
    await userEvent.click(screen.getByRole('radio', { name: 'Ступени' }));
    await userEvent.click(screen.getByText('Одна на все грани'));
    expect(
      screen.getByRole('radio', { name: 'Ступени (свои текстуры)' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    await screen.findByText('Карточка');
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    const body = JSON.parse(post?.[1]?.body as string) as {
      textures: unknown;
      shapes: Record<
        string,
        { textures: Record<string, string>; color: string }
      >;
    };
    expect(body.textures).toBeNull();
    expect(Object.keys(body.shapes)).toEqual(['stairs']);
    const { textures, color } = body.shapes.stairs;
    expect(textures.top).toBe(textures.side);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
