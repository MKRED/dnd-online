import { describe, expect, it } from 'vitest';
import type { ModelMesh } from 'shared';
import { furnitureModelSnapshotPath, modelSnapshotPath } from './voxelModelApi';

// Снимок модели с файлом для списков (docs/plan/blocks.md, этап 9г).

const mesh: ModelMesh = {
  format: 'stl',
  version: 1,
  color: '#9a948a',
  fit: { up: 'z', turn: 0 },
};
const image = { version: 3, width: 512, height: 512 } as never;

describe('адрес снимка модели', () => {
  it('у модели — только с файлом и картинкой', () => {
    expect(modelSnapshotPath({ id: 'm1', mesh, image })).toBe(
      '/voxel-models/m1/image?variant=thumb&v=3',
    );
    expect(modelSnapshotPath({ id: 'm1', image })).toBeNull();
    expect(modelSnapshotPath({ id: 'm1', mesh, image: null })).toBeNull();
  });

  it('у модели обстановки — по версии от сервера', () => {
    expect(furnitureModelSnapshotPath({ id: 'm2', snapshotVersion: 2 })).toBe(
      '/voxel-models/m2/image?variant=thumb&v=2',
    );
    expect(
      furnitureModelSnapshotPath({ id: 'm2', snapshotVersion: null }),
    ).toBeNull();
    expect(furnitureModelSnapshotPath({ id: 'm2' })).toBeNull();
  });
});
