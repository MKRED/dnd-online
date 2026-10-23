import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelMesh, VoxelModel } from 'shared';
import { newMeshDraft, resizedEmpty, toMeshDraft } from './meshDraft';
import { saveModelMesh } from './saveModelMesh';

// Файл модели в форме (docs/plan/blocks.md, этап 9): что уходит на сервер после записи.

const api = vi.hoisted(() => ({
  uploadModelMesh: vi.fn(),
  patchModelMesh: vi.fn(),
  removeModelMesh: vi.fn(),
}));
vi.mock('../../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../voxelModels')>()),
  ...api,
}));

const stlMesh: ModelMesh = {
  format: 'stl',
  version: 1,
  color: '#9a948a',
  fit: { up: 'z', turn: 0 },
};

const model = (mesh?: ModelMesh) =>
  ({
    id: 'm1',
    size: [1, 1, 1],
    palette: [],
    voxels: 'AIAg',
    cells: {},
    ...(mesh && { mesh }),
  }) as unknown as VoxelModel;

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
  });

  it('сохранённый без правок — ни одного запроса; убранный — удаляется', async () => {
    const saved = model(stlMesh);
    expect(await saveModelMesh(saved, toMeshDraft(saved))).toBeNull();
    expect(api.uploadModelMesh).not.toHaveBeenCalled();
    expect(api.patchModelMesh).not.toHaveBeenCalled();
    await saveModelMesh(saved, null);
    expect(api.removeModelMesh).toHaveBeenCalledWith('m1');
    vi.clearAllMocks();
    await saveModelMesh(model(), null);
    expect(api.removeModelMesh).not.toHaveBeenCalled();
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
