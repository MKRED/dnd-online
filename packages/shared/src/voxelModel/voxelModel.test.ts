import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  decodeVoxels,
  encodeVoxels,
} from './voxelCodec.js';
import { modelVoxelCount, voxelIndex } from './voxelModel.js';
import {
  checkVoxelModel,
  emptyVoxelModel,
  readVoxelModelFields,
} from './voxelModelCheck.js';

const encoded = (voxels: Uint8Array) => bytesToBase64(encodeVoxels(voxels));

describe('сжатие вокселей', () => {
  it('серии туда и обратно, длинные серии — в несколько байт длины', () => {
    const voxels = new Uint8Array(32 ** 3);
    voxels.fill(3, 100, 300);
    voxels[5000] = 255;
    const bytes = encodeVoxels(voxels);
    expect(bytes.length).toBeLessThan(20);
    expect(decodeVoxels(bytes, voxels.length)).toEqual(voxels);
  });

  it('испорченные данные — null', () => {
    const bytes = encodeVoxels(new Uint8Array(10).fill(1));
    expect(decodeVoxels(bytes, 9)).toBeNull();
    expect(decodeVoxels(bytes, 11)).toBeNull();
    expect(decodeVoxels(Uint8Array.from([1, 0]), 0)).toBeNull();
    expect(decodeVoxels(Uint8Array.from([1, 0x80]), 10)).toBeNull();
    expect(base64ToBytes('не base64')).toBeNull();
  });

  it('base64 большого массива без переполнения стека', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => i % 251);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('checkVoxelModel', () => {
  const model = () => {
    const voxels = new Uint8Array(modelVoxelCount([2, 1, 1]));
    voxels[voxelIndex([32, 16, 16], 20, 0, 3)] = 2;
    return {
      size: [2, 1, 1] as const,
      palette: ['#112233', '#aabbcc'],
      voxels: encoded(voxels),
      cells: { '1,0,0': 'stand' as const },
    };
  };

  it('пустая модель и модель с цветами палитры — в порядке', () => {
    expect(checkVoxelModel(emptyVoxelModel())).toBeNull();
    expect(checkVoxelModel(model())).toBeNull();
  });

  it('воксель с цветом вне палитры', () => {
    expect(checkVoxelModel({ ...model(), palette: ['#112233'] })).toMatch(
      /палитре/,
    );
  });

  it('длина вокселей не по размеру, размер и клетки за пределами', () => {
    expect(checkVoxelModel({ ...model(), size: [1, 1, 1] })).toMatch(/размер/);
    expect(checkVoxelModel({ ...model(), size: [9, 1, 1] })).toMatch(/Размер/);
    expect(checkVoxelModel({ ...model(), cells: { '2,0,0': 'free' } })).toMatch(
      /за пределами/,
    );
    expect(
      checkVoxelModel({ ...model(), cells: { '0,0,0': 'wall' } as never }),
    ).toMatch(/Свойства клеток/);
  });

  it('из базы испорченная модель читается пустой', () => {
    expect(readVoxelModelFields({ ...model() })).toEqual(model());
    expect(readVoxelModelFields({ size: [1, 1, 1], voxels: 'xx' })).toEqual(
      emptyVoxelModel(),
    );
  });
});
