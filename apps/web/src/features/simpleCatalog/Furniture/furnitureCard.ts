import {
  FURNITURE_MOUNT_LABELS,
  FURNITURE_MOUNTS,
  type Furniture,
} from 'shared';

// Виды записей для чипов и бейджей раздела «Обстановка» — по креплению.
export const FURNITURE_KINDS = [...FURNITURE_MOUNTS, 'container'] as const;
export const FURNITURE_KIND_LABELS: Record<string, string> = {
  floor: 'На полу',
  wall: 'На стене',
  ceiling: 'На потолке',
  doorway: 'В проёме',
  container: 'Контейнер',
};

// Контейнер (этап 11) — своим чипом рядом с креплением.
export const furnitureKinds = (entry: Furniture) =>
  entry.container ? [entry.mount, 'container'] : [entry.mount];

// Что даёт крепление на карте (docs/plan/blocks.md, «Понятия»): подсказка в форме и
// строка карточки.
export const MOUNT_HINTS: Record<Furniture['mount'], string> = {
  floor: 'Стоит на блоке или на верхе другой обстановки, где можно встать.',
  wall: 'Висит на грани блока и не занимает клетки для пути — картина, факел.',
  ceiling: 'Висит под блоком — люстра, клетка на цепи.',
  doorway:
    'Дверь или ворота: стоит на полу проёма и занимает его клетки, положения переключают на карте.',
};

export const mountText = (mount: Furniture['mount']) =>
  `${FURNITURE_MOUNT_LABELS[mount]} — ${MOUNT_HINTS[mount].toLowerCase()}`;
