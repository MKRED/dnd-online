import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  emptyVoxelModel,
  type VoxelModel,
  type VoxelModelFields,
} from 'shared';
import { renderWithProviders } from '../../../test/render';
import { SimpleCreatePage } from '../SimpleFormPage';
import SimpleViewPage from '../SimpleViewPage';
import { MODELS } from '../simpleCatalogs';

// Холсты three в jsdom не рисуются: предпросмотр — заглушка, а редактор — окно с
// одной кнопкой «Готово», которая отдаёт готовую модель.
const drawn: VoxelModelFields = {
  size: [2, 1, 1],
  palette: ['#8a5a2b'],
  // Один воксель в углу модели 2×1×1.
  voxels: 'AQEA/z8=',
  cells: { '0,0,0': 'stand' },
};
vi.mock('../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../voxelModels')>()),
  ModelPreview: () => <div>Предпросмотр модели</div>,
  ModelThumbnail: () => <div>Миниатюра</div>,
  VoxelEditorModal: ({
    onDone,
    onClose,
  }: {
    onDone: (model: VoxelModelFields) => void;
    onClose: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onDone(drawn);
        onClose();
      }}
    >
      Готово в редакторе
    </button>
  ),
}));

const AUTHOR = '11111111-1111-4111-8111-111111111111';

const barrel: VoxelModel = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Бочка',
  description: '',
  sources: [],
  isPublic: true,
  image: null,
  authorId: AUTHOR,
  authorNickname: 'Мастер',
  createdAt: '2026-10-23T00:00:00.000Z',
  updatedAt: '2026-10-23T00:00:00.000Z',
  ...drawn,
  size: [1, 2, 1],
  origin: null,
};

const authAs = (id: string) => ({
  user: { id, login: 'u', nickname: 'u', settings: DEFAULT_USER_SETTINGS },
});

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

describe('раздел «Модели»', () => {
  it('карточка: размер, цвета и свойства клеток', async () => {
    stubFetch(() => barrel);
    renderWithProviders(
      <Routes>
        <Route path="/models/:id" element={<SimpleViewPage def={MODELS} />} />
      </Routes>,
      { route: `/models/${barrel.id}`, auth: authAs(AUTHOR) },
    );
    expect(
      await screen.findByRole('heading', { name: 'Бочка' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1 × 1 × 2 клетки (ширина × глубина × высота)'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 цвет')).toBeInTheDocument();
    expect(screen.getByText('Можно встать сверху — 1')).toBeInTheDocument();
    expect(screen.getByText('Предпросмотр модели')).toBeInTheDocument();
  });

  it('новая модель: нарисовать в редакторе и сохранить', async () => {
    const fetchMock = stubFetch((_url, init) =>
      init?.method === 'POST' ? barrel : [],
    );
    renderWithProviders(
      <Routes>
        <Route path="/models/new" element={<SimpleCreatePage def={MODELS} />} />
        <Route path="/models/:id" element={<div>Карточка</div>} />
      </Routes>,
      { route: '/models/new', auth: authAs(AUTHOR) },
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Название/), 'Бочка');
    expect(screen.getByText(/Пусто — модель ещё не нарисована/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Нарисовать модель' }));
    await user.click(
      await screen.findByRole('button', { name: 'Готово в редакторе' }),
    );
    expect(
      screen.getByRole('button', { name: 'Открыть редактор' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await screen.findByText('Карточка');
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    )!;
    expect(post[0] as string).toMatch(/\/voxel-models$/);
    expect(JSON.parse(post[1]!.body as string)).toMatchObject({
      name: 'Бочка',
      ...drawn,
    });
  });

  it('чужая опубликованная — «Скопировать себе» ведёт на копию', async () => {
    const copy = { ...barrel, id: '33333333-3333-4333-8333-333333333333' };
    const fetchMock = stubFetch((url) =>
      url.endsWith('/copy') ? copy : barrel,
    );
    renderWithProviders(
      <Routes>
        <Route path="/models/:id" element={<SimpleViewPage def={MODELS} />} />
      </Routes>,
      {
        route: `/models/${barrel.id}`,
        auth: authAs('44444444-4444-4444-8444-444444444444'),
      },
    );
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Скопировать себе' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            (url as string).endsWith(`/voxel-models/${barrel.id}/copy`) &&
            init?.method === 'POST',
        ),
      ).toBe(true),
    );
  });

  it('пустая модель по умолчанию — одна клетка без цветов', () => {
    expect(emptyVoxelModel()).toMatchObject({ size: [1, 1, 1], palette: [] });
  });
});
