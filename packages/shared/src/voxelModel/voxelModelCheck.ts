import { base64ToBytes, decodeVoxels } from './voxelCodec.js';
import {
  isModelCells,
  isModelPalette,
  isModelSize,
  MODEL_VOXELS_MAX_LENGTH,
  modelVoxelCount,
  type VoxelModelFields,
} from './voxelModel.js';

// Что не так с моделью целиком — для сервера (400) и формы; null — всё в порядке.
// Поля по отдельности проверяют isModel*, здесь — то, что зависит от нескольких полей:
// длина вокселей по размеру, цвета вокселей по палитре, клетки внутри размера.
export function checkVoxelModel(model: VoxelModelFields): string | null {
  if (!isModelSize(model.size))
    return 'Размер модели — [x, y, z] в клетках, от 1 до 8 по каждой оси';
  if (!isModelPalette(model.palette))
    return 'Палитра — до 255 цветов в виде #rrggbb';
  if (!isModelCells(model.cells))
    return 'Свойства клеток — объект {"x,y,z": obstacle | difficult | free | stand}';
  if (
    typeof model.voxels !== 'string' ||
    model.voxels.length > MODEL_VOXELS_MAX_LENGTH
  )
    return 'Воксели — сжатые данные в base64, не больше 1,5 млн знаков';
  const bytes = base64ToBytes(model.voxels);
  const voxels = bytes && decodeVoxels(bytes, modelVoxelCount(model.size));
  if (!voxels) return 'Воксели испорчены или не совпадают с размером модели';
  const colors = model.palette.length;
  if (voxels.some((value) => value > colors))
    return 'У вокселя цвет, которого нет в палитре';
  const [sx, sy, sz] = model.size;
  for (const key of Object.keys(model.cells)) {
    const [x, y, z] = key.split(',').map(Number);
    if (x >= sx || y >= sy || z >= sz)
      return `Клетка ${key} — за пределами модели`;
  }
  return null;
}

// Модель из одной пустой клетки — начало новой записи и замена испорченной в базе.
export function emptyVoxelModel(): VoxelModelFields {
  return {
    size: [1, 1, 1],
    palette: [],
    // Одна серия нулей длиной 4096: значение 0, длина 0x80 0x20 в LEB128.
    voxels: 'AIAg',
    cells: {},
  };
}

// Поля модели из записи в базе: испорченная модель читается пустой, справочник не падает.
export function readVoxelModelFields(
  extra: Record<string, unknown>,
): VoxelModelFields {
  const model = {
    size: extra.size,
    palette: extra.palette,
    voxels: extra.voxels,
    cells: extra.cells,
  } as VoxelModelFields;
  return checkVoxelModel(model) === null ? model : emptyVoxelModel();
}
