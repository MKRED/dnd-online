import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Monster, VoxelModel, VoxelModelFields } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { renderWithProviders } from '../../../test/render';
import MonsterForm from '../MonsterForm';

// Холсты three в jsdom не рисуются: превью и миниатюра — заглушки, редактор — окно с одной
// кнопкой «Готово», перевод файла в воксели — готовый ответ.
const drawn: VoxelModelFields = {
  size: [2, 3, 2],
  palette: ['#8a5a2b'],
  voxels: 'AQEA/x8=',
  cells: {},
};
vi.mock('../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../voxelModels')>()),
  ModelThumbnail: () => null,
  loadMeshToModel: () =>
    Promise.resolve(() => Promise.resolve({ format: 'stl', fields: drawn })),
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
vi.mock('./MonsterModelPreview', () => ({
  default: ({ model }: { model: { id: string; scale: number } }) => (
    <div>
      Превью {model.id} ×{model.scale}
    </div>
  ),
}));

const ogre: VoxelModel = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Огр с дубиной',
  description: '',
  sources: [],
  isPublic: false,
  image: null,
  authorId: 'author-1',
  authorNickname: 'Мастер',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  origin: null,
  ...drawn,
};
const NEW_ID = '33333333-3333-4333-8333-333333333333';
const MESH = {
  format: 'stl',
  version: 1,
  color: '#b8b0a2',
  fit: { up: 'z', turn: 0 },
};

function stubFetch(models: VoxelModel[]) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    const path = url as string;
    const method = init?.method ?? 'GET';
    const body = path.endsWith('/mesh')
      ? MESH
      : path.includes('/voxel-models')
        ? method === 'GET'
          ? models
          : {
              ...ogre,
              ...(JSON.parse(init!.body as string) as object),
              id: NEW_ID,
            }
        : sampleMonster;
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// Тело последнего запроса, сохранившего монстра.
const savedMonster = (fetchMock: ReturnType<typeof stubFetch>) => {
  const call = fetchMock.mock.calls
    .filter(
      ([url, init]) =>
        /\/monsters(\/[^/]+)?$/.test(url as string) &&
        (init?.method === 'POST' || init?.method === 'PUT'),
    )
    .at(-1);
  return call && (JSON.parse(call[1]!.body as string) as Monster);
};

function renderForm(monster: Monster | null) {
  renderWithProviders(
    <MonsterForm
      monster={monster}
      submitLabel={monster ? 'Сохранить' : 'Создать'}
      cancelTo="/monsters"
      onSaved={vi.fn()}
    />,
  );
}

describe('MonsterModelSection', () => {
  it('выбирает свою модель и поправку размера — ссылка уходит с монстром', async () => {
    const fetchMock = stubFetch([ogre]);
    renderForm(null);
    const user = userEvent.setup();
    expect(
      screen.getByText('Без модели на карте стоит карточка с картинкой'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Название/), 'Огр');
    await user.click(screen.getByRole('combobox', { name: 'Модель' }));
    await user.click(
      await screen.findByRole('option', { name: 'Огр с дубиной' }),
    );
    expect(await screen.findByText(`Превью ${ogre.id} ×1`)).toBeInTheDocument();
    screen.getByRole('slider', { name: 'Размер модели на карте' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Размер на карте: ×1,04')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await waitFor(() =>
      expect(savedMonster(fetchMock)?.model).toEqual({
        id: ogre.id,
        scale: 1.04,
      }),
    );
  });

  it('«Убрать модель» снимает ссылку', async () => {
    const fetchMock = stubFetch([ogre]);
    renderForm({ ...sampleMonster, model: { id: ogre.id, scale: 2 } });
    const user = userEvent.setup();
    expect(await screen.findByText(`Превью ${ogre.id} ×2`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Убрать модель' }));
    expect(
      screen.getByText('Без модели на карте стоит карточка с картинкой'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(savedMonster(fetchMock)?.model).toBeNull());
  });

  it('удалённая из «Моделей» модель снимается с предупреждением', async () => {
    const fetchMock = stubFetch([]);
    renderForm({ ...sampleMonster, model: { id: ogre.id, scale: 1 } });
    const user = userEvent.setup();
    expect(
      await screen.findByText(/Прежняя модель удалена из «Моделей»/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(savedMonster(fetchMock)?.model).toBeNull());
  });

  it('загруженный файл сразу становится моделью в «Моделях» под именем монстра', async () => {
    const fetchMock = stubFetch([]);
    renderForm(null);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Название/), 'Огр');
    const input = document.querySelector(
      'input[type=file][accept*=".glb"]',
    ) as HTMLInputElement;
    await user.upload(input, new File(['solid'], 'ogre.stl'));

    expect(await screen.findByText(`Превью ${NEW_ID} ×1`)).toBeInTheDocument();
    const created = fetchMock.mock.calls.find(
      ([url, init]) =>
        (url as string).endsWith('/voxel-models') && init?.method === 'POST',
    );
    expect(JSON.parse(created![1]!.body as string)).toMatchObject({
      name: 'Огр',
      isPublic: false,
      ...drawn,
    });
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          (url as string).endsWith(`/voxel-models/${NEW_ID}/mesh`) &&
          init?.method === 'PUT',
      ),
    ).toBe(true);
    // Модель с файлом правится в «Моделях», в новой вкладке.
    expect(
      screen.getByRole('link', { name: 'Изменить модель' }),
    ).toHaveAttribute('href', `/models/${NEW_ID}/edit`);

    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await waitFor(() =>
      expect(savedMonster(fetchMock)?.model).toEqual({ id: NEW_ID, scale: 1 }),
    );
  });

  it('«Нарисовать новую» сохраняет нарисованную модель и выбирает её', async () => {
    const fetchMock = stubFetch([]);
    renderForm(null);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Название/), 'Огр');
    await user.click(screen.getByRole('button', { name: 'Нарисовать новую' }));
    await user.click(
      screen.getByRole('button', { name: 'Готово в редакторе' }),
    );

    expect(await screen.findByText(`Превью ${NEW_ID} ×1`)).toBeInTheDocument();
    const created = fetchMock.mock.calls.find(
      ([url, init]) =>
        (url as string).endsWith('/voxel-models') && init?.method === 'POST',
    );
    expect(JSON.parse(created![1]!.body as string)).toMatchObject({
      name: 'Огр',
      ...drawn,
    });
  });
});
