import {
  emptyVoxelModel,
  MODEL_CELL_KIND_LABELS,
  MODEL_CELL_VOXELS,
  MODEL_PALETTE_MAX,
  MODEL_SIZE_MAX,
  type VoxelModelInput,
} from 'shared';
import { fieldLines, labeled, sample } from './common.js';

const FIELDS = {
  name: 'название модели, до 100 символов',
  size: `[x, y, z] — ширина, высота и глубина в клетках карты, от 1 до ${MODEL_SIZE_MAX}; в клетке ${MODEL_CELL_VOXELS}×${MODEL_CELL_VOXELS}×${MODEL_CELL_VOXELS} вокселей`,
  palette: `цвета вокселей #rrggbb, до ${MODEL_PALETTE_MAX}`,
  voxels:
    'сжатые воксели в base64 (серии байтов с длиной в LEB128; 0 — пусто, 1… — цвет палитры). Руками их не пишут и не читают: модель рисуют в вебе в воксельном редакторе («Справочник» → «Модели»). При update не присылай — останутся как были',
  cells: `свои свойства клеток для пути: {"x,y,z": вид} в клетках модели, вид — ${labeled(MODEL_CELL_KIND_LABELS)}. Клетки без записи — «как есть»: с вокселями — препятствие, пустая — свободна. Пустая клетка остаётся воздухом при любом свойстве. При update объект cells заменяется целиком`,
  description: 'описание',
  sources: 'источники — строки',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof VoxelModelInput, string>;

export const voxelModelGuide = () => [
  'МОДЕЛЬ (kind voxel_model) — вид из вокселей для обстановки на карте. Что это в игре, решает роль: обстановка (kind furniture) ссылается на модель',
  ...fieldLines(FIELDS),
  '',
  `Пустая модель в одну клетку: ${sample(emptyVoxelModel())}`,
  '',
  '- «Вперёд» у модели — всегда север (−z): так она смотрит на карте при повороте 0.',
  '- Через MCP модель заводят и правят название, описание и свойства клеток; рисует её пользователь в вебе. В обстановку идёт только своя модель: чужую сначала копируют в вебе.',
];
