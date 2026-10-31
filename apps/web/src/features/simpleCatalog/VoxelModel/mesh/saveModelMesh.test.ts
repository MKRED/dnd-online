import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelMesh, VoxelModel } from 'shared';
import { newMeshDraft, resizedEmpty, toMeshDraft } from './meshDraft';
import { saveModelMesh } from './saveModelMesh';

// Файл модели в форме (docs/plan/blocks.md, этап 9): что уходит на сервер после записи.

const api = vi.hoisted(() => ({
  uploadModelMesh: vi.fn(),
  patchModelMesh: vi.fn(),
  removeModelMesh: vi.fn(),
  meshSnapshot: vi.fn(),
  voxelModelsApi: { uploadImage: vi.fn(), deleteImage: vi.fn() },
}));
vi.mock('../../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../voxelModels')>()),
  ...api,
  // Снимок рисует three на WebGL — в тестах его нет.
  loadMeshSnapshot: () => Promise.resolve(api.meshSnapshot),
}));
const snapshotFile = () =>
  api.voxelModelsApi.uploadImage.mock.calls[0]?.[1] as File | undefined;

const stlMesh: ModelMesh = {
  format: 'stl',
  version: 1,
  color: '#9a948a',
  fit: { up: 'z', turn: 0 },
};

const model = (mesh?: ModelMesh, image: { version: number } | null = null) =>
  ({
    id: 'm1',
    size: [1, 1, 1],
    palette: [],
    voxels: 'AIAg',
    cells: {},
    image,
    ...(mesh && { mesh }),
  }) as unknown as VoxelModel;

beforeEach(() =>
  api.meshSnapshot.mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
);
afterEach(() => vi.clearAllMocks());

describe('saveModelMesh', () => {
  it('новый файл загружается, отличные от умолчания цвет и вписывание — правкой', async () => {
    api.uploadModelMesh.mockResolvedValue(stlMesh);
    const file = new File([new Uint8Array(134)], 'statue.stl');
    const draft = {
      ...newMeshDraft(file, 'stl'),
      color: '#ff0000',
      fit: { up: 'z', turn: 1 } as const,
    };
    expect(await saveModelMesh(model(), draft)).toBeNull();
    expect(api.uploadModelMesh).toHaveBeenCalledWith('m1', file);
    expect(api.patchModelMesh).toHaveBeenCalledWith('m1', {
      color: '#ff0000',
      fit: { up: 'z', turn: 1 },
    });
    // Снимок для списка — с тем же файлом, вписыванием и цветом, картинкой записи.
    expect(api.meshSnapshot).toHaveBeenCalledWith(model(), {
      source: draft.source,
      fit: { up: 'z', turn: 1 },
      color: '#ff0000',
    });
    expect(snapshotFile()?.type).toBe('image/png');
  });

  it('сохранённый без правок — файл не трогается, снимок обновляется; убранный — удаляется со снимком', async () => {
    const saved = model(stlMesh, { version: 2 });
    expect(await saveModelMesh(saved, toMeshDraft(saved))).toBeNull();
    expect(api.uploadModelMesh).not.toHaveBeenCalled();
    expect(api.patchModelMesh).not.toHaveBeenCalled();
    expect(api.voxelModelsApi.uploadImage).toHaveBeenCalledTimes(1);
    await saveModelMesh(saved, null);
    expect(api.removeModelMesh).toHaveBeenCalledWith('m1');
    expect(api.voxelModelsApi.deleteImage).toHaveBeenCalledWith('m1');
    vi.clearAllMocks();
    await saveModelMesh(model(), null);
    expect(api.removeModelMesh).not.toHaveBeenCalled();
    expect(api.voxelModelsApi.deleteImage).not.toHaveBeenCalled();
  });

  it('снимка нет или он не загрузился — модель всё равно сохранена', async () => {
    api.meshSnapshot.mockResolvedValue(null);
    const saved = model(stlMesh);
    expect(await saveModelMesh(saved, toMeshDraft(saved))).toBeNull();
    expect(api.voxelModelsApi.uploadImage).not.toHaveBeenCalled();
    api.meshSnapshot.mockResolvedValue(new Blob(['png']));
    api.voxelModelsApi.uploadImage.mockRejectedValue(new Error('сеть'));
    expect(await saveModelMesh(saved, toMeshDraft(saved))).toBeNull();
  });

  it('ошибку сервера отдаёт текстом для формы', async () => {
    api.uploadModelMesh.mockRejectedValue(new Error('сеть'));
    const file = new File([new Uint8Array(134)], 'statue.stl');
    expect(await saveModelMesh(model(), newMeshDraft(file, 'stl'))).toBe(
      'Не удалось сохранить файл модели',
    );
  });
});

it('новый размер — пустая сетка, свойства клеток за краем пропадают', () => {
  const resized = resizedEmpty(
    {
      size: [2, 1, 1],
      palette: ['#000000'],
      voxels: 'x',
      cells: { '0,0,0': 'stand', '1,0,0': 'free' },
    },
    [1, 2, 1],
  );
  expect(resized.size).toEqual([1, 2, 1]);
  expect(resized.cells).toEqual({ '0,0,0': 'stand' });
  expect(resized.voxels).not.toBe('x');
});
