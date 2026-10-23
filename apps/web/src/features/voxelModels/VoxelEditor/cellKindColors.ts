import type { ModelCellKind } from 'shared';

// Цвета свойств клеток — и в сцене, и в легенде панели.
export const CELL_KIND_COLORS: Record<ModelCellKind, string> = {
  obstacle: '#e03131',
  difficult: '#f08c00',
  free: '#2f9e44',
  stand: '#1c7ed6',
};
