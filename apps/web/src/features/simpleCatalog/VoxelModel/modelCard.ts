import {
  MODEL_CELL_KIND_LABELS,
  MODEL_CELL_KINDS,
  pluralRu,
  type VoxelModelFields,
} from 'shared';

// Виды записей для чипов и бейджей раздела «Модели»: по размеру — в одну клетку или
// больше (на карте большие поворачиваются только на 90°, docs/plan/blocks.md, «Понятия»).
export const MODEL_KINDS = ['single', 'large'] as const;
export const MODEL_KIND_LABELS: Record<string, string> = {
  single: 'Одна клетка',
  large: 'Больше клетки',
};

export const modelKinds = ({ size }: VoxelModelFields) => [
  size.every((n) => n === 1) ? 'single' : 'large',
];

// «2 × 1 × 3 клетки» — ширина, глубина, высота, как у размера объекта на карте.
export function modelSizeText({ size: [x, y, z] }: VoxelModelFields): string {
  const cells = pluralRu(Math.max(x, y, z), ['клетка', 'клетки', 'клеток']);
  return `${x} × ${z} × ${y} ${x * y * z === 1 ? 'клетка' : cells} (ширина × глубина × высота)`;
}

// Свои свойства клеток по видам: «Можно встать сверху — 2, свободно — 1»; без своих —
// «Как есть».
export function modelCellsText({ cells }: VoxelModelFields): string {
  const counts = MODEL_CELL_KINDS.map((kind) => ({
    kind,
    count: Object.values(cells).filter((value) => value === kind).length,
  })).filter(({ count }) => count > 0);
  if (!counts.length) return 'Как есть: клетки с вокселями — препятствие';
  return counts
    .map(({ kind, count }, i) => {
      const label = MODEL_CELL_KIND_LABELS[kind];
      return `${i ? label.toLowerCase() : label} — ${count}`;
    })
    .join(', ');
}

export const modelColorsText = ({ palette }: VoxelModelFields) =>
  palette.length
    ? `${palette.length} ${pluralRu(palette.length, ['цвет', 'цвета', 'цветов'])}`
    : 'Пусто — модель ещё не нарисована';
