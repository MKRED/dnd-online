import { describe, expect, it } from 'vitest';
import { emptyVoxelModel, type MonsterRefModel } from 'shared';
import { monsterModelLook } from './monsterModelLook';

const MODEL = '00000000-0000-4000-8000-000000000007';
const path = (modelId: string, version: number) => `m/${modelId}/${version}`;

describe('monsterModelLook', () => {
  it('файл модели — по адресу и со своей поправкой; поворот — в счёте модели персонажа', () => {
    const model: MonsterRefModel = {
      ...emptyVoxelModel(),
      id: MODEL,
      scale: 1.5,
      mesh: {
        format: 'stl',
        version: 4,
        color: '#aa3311',
        fit: { up: 'z', turn: 1 },
      },
    };
    expect(monsterModelLook(model, path)).toEqual({
      kind: 'file',
      path: `m/${MODEL}/4`,
      format: 'stl',
      color: '#aa3311',
      fit: { scale: 1.5, turn: 3, up: 'z' },
    });
  });

  it('рисованная модель — воксели без загрузки', () => {
    const model: MonsterRefModel = {
      ...emptyVoxelModel(),
      id: MODEL,
      scale: 2,
    };
    expect(monsterModelLook(model, path)).toEqual({
      kind: 'voxels',
      fields: model,
      fit: { scale: 2, turn: 0, up: 'y' },
    });
  });
});
