import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  type Furniture,
  type VoxelModel,
  type VoxelModelFields,
} from 'shared';
import { renderWithProviders } from '../../../test/render';
import { SimpleCreatePage } from '../SimpleFormPage';
import SimpleViewPage from '../SimpleViewPage';
import { FURNITURE } from '../simpleCatalogs';
import { modelDeleteConfirmText } from '../VoxelModel/modelDeleteConfirm';

// Холсты three в jsdom не рисуются: предпросмотр и миниатюра — заглушки, редактор —
// окно с одной кнопкой «Готово», которая отдаёт нарисованную модель.
const drawn: VoxelModelFields = {
  size: [1, 1, 1],
  palette: ['#8a5a2b'],
  voxels: 'AQEA/x8=',
  cells: {},
};
vi.mock('../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../voxelModels')>()),
  ModelPreview: () => <div>Предпросмотр модели</div>,
  ModelThumbnail: () => null,
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
const auth = {
  user: {
    id: AUTHOR,
    login: 'u',
    nickname: 'u',
    settings: DEFAULT_USER_SETTINGS,
  },
};

const entryFields = {
  description: '',
  sources: [],
  isPublic: false,
  image: null,
  authorId: AUTHOR,
  authorNickname: 'Мастер',
  createdAt: '2026-10-23T00:00:00.000Z',
  updatedAt: '2026-10-23T00:00:00.000Z',
  origin: null,
};

const table: VoxelModel = {
  ...entryFields,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Стол',
  ...drawn,
};

const furniture: Furniture = {
  ...entryFields,
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Обеденный стол',
  modelId: table.id,
  mount: 'floor',
  positions: [],
  model: { id: table.id, name: 'Стол', ...drawn, origin: null },
  models: {
    [table.id]: { id: table.id, name: 'Стол', ...drawn, origin: null },
  },
};

const openDoor: VoxelModel = {
  ...table,
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Открытая дверь',
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

const posted = (fetchMock: ReturnType<typeof stubFetch>, path: RegExp) =>
  fetchMock.mock.calls
    .filter(
      ([url, init]) => init?.method === 'POST' && path.test(url as string),
    )
    .map(([, init]) => JSON.parse(init!.body as string) as object);

const renderCreate = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/furniture/new"
        element={<SimpleCreatePage def={FURNITURE} />}
      />
      <Route path="/furniture/:id" element={<div>Карточка</div>} />
    </Routes>,
    { route: '/furniture/new', auth },
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('раздел «Обстановка»', () => {
  it('своя модель и крепление уходят в запрос, без модели — подсказка', async () => {
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? furniture
        : url.includes('/voxel-models')
          ? [table]
          : [],
    );
    renderCreate();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Название/), 'Обеденный стол');
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(
      await screen.findByText('Выберите модель или нарисуйте новую'),
    ).toBeInTheDocument();
    expect(posted(fetchMock, /\/furniture$/)).toHaveLength(0);

    await user.click(screen.getByRole('combobox', { name: /Модель/ }));
    await user.click(await screen.findByRole('option', { name: 'Стол' }));
    await user.click(screen.getByRole('radio', { name: 'Стена' }));
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await screen.findByText('Карточка');
    const [body] = posted(fetchMock, /\/furniture$/);
    expect(body).toMatchObject({ modelId: table.id, mount: 'wall' });
    expect(body).not.toHaveProperty('model');
  });

  it('«Нарисовать новую» сохраняет модель сразу и выбирает её', async () => {
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST' && url.endsWith('/voxel-models')
        ? table
        : init?.method === 'POST'
          ? furniture
          : [],
    );
    renderCreate();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Название/), 'Обеденный стол');
    await user.click(screen.getByRole('button', { name: 'Нарисовать новую' }));
    await user.click(
      await screen.findByRole('button', { name: 'Готово в редакторе' }),
    );
    await waitFor(() =>
      expect(posted(fetchMock, /\/voxel-models$/)).toEqual([
        expect.objectContaining({ name: 'Обеденный стол', ...drawn }),
      ]),
    );
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await screen.findByText('Карточка');
    expect(posted(fetchMock, /\/furniture$/)).toEqual([
      expect.objectContaining({ modelId: table.id }),
    ]);
  });

  it('«Проём» включает положения «Закрыта» и «Открыта»; у каждого — своя модель', async () => {
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? furniture
        : url.includes('/voxel-models')
          ? [table, openDoor]
          : [],
    );
    renderCreate();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Название/), 'Дверь');
    await user.click(screen.getByRole('radio', { name: 'Проём' }));
    const names = screen.getAllByRole('textbox', { name: /Положение/ });
    expect(names.map((input) => (input as HTMLInputElement).value)).toEqual([
      'Закрыта',
      'Открыта',
    ]);
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(
      await screen.findAllByText('Выберите модель или нарисуйте новую'),
    ).toHaveLength(2);
    expect(posted(fetchMock, /\/furniture$/)).toHaveLength(0);

    const pickers = screen.getAllByRole('combobox', {
      name: /Модель положения/,
    });
    await user.click(pickers[0]);
    await user.click(await screen.findByRole('option', { name: 'Стол' }));
    await user.click(pickers[1]);
    await user.click(
      await screen.findByRole('option', { name: 'Открытая дверь' }),
    );
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await screen.findByText('Карточка');
    const [body] = posted(fetchMock, /\/furniture$/);
    expect(body).toMatchObject({
      modelId: table.id,
      mount: 'doorway',
      positions: [
        { name: 'Закрыта', modelId: table.id },
        { name: 'Открыта', modelId: openDoor.id },
      ],
    });
  });

  it('карточка двери: строка на положение и переключатель над моделью', async () => {
    stubFetch(() => ({
      ...furniture,
      mount: 'doorway',
      positions: [
        { name: 'Закрыта', modelId: table.id },
        { name: 'Открыта', modelId: openDoor.id },
      ],
      models: {
        ...furniture.models,
        [openDoor.id]: { ...furniture.model!, id: openDoor.id },
      },
    }));
    renderWithProviders(
      <Routes>
        <Route
          path="/furniture/:id"
          element={<SimpleViewPage def={FURNITURE} />}
        />
      </Routes>,
      { route: `/furniture/${furniture.id}`, auth },
    );
    expect(await screen.findByText(/Закрыта —/)).toBeInTheDocument();
    expect(screen.getByText(/Открыта —/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Открыта' })).toBeInTheDocument();
  });

  it('карточка без модели: модель удалена', async () => {
    stubFetch(() => ({ ...furniture, model: null }));
    renderWithProviders(
      <Routes>
        <Route
          path="/furniture/:id"
          element={<SimpleViewPage def={FURNITURE} />}
        />
      </Routes>,
      { route: `/furniture/${furniture.id}`, auth },
    );
    expect(
      await screen.findByText('Удалена — обстановка без вида'),
    ).toBeInTheDocument();
  });
});

describe('вопрос перед удалением модели', () => {
  it('называет обстановку с моделью', () => {
    expect(modelDeleteConfirmText('Стол', { furniture: [] })).toBe(
      'Удалить модель «Стол» безвозвратно?',
    );
    expect(
      modelDeleteConfirmText('Стол', {
        furniture: [{ id: '1', name: 'Обеденный стол' }],
      }),
    ).toMatch(/в обстановке: «Обеденный стол»/);
  });
});
