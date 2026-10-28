import { useState } from 'react';
import type { PanelEdgeDrag, PanelEdgeProps } from './PanelEdge';
import { readPanelWidth, savePanelWidth } from './panelWidth';

// Ширина панели с краем: запомненная на устройстве (своя у каждой панели, ключ
// storageKey) и та, что под мышью, пока тянут. edge — готовые свойства для PanelEdge,
// кроме onCollapse.
export function usePanelWidth(storageKey: string, defaultWidth: number) {
  const [width, setWidth] = useState(() =>
    readPanelWidth(storageKey, defaultWidth),
  );
  const [drag, setDrag] = useState<PanelEdgeDrag | null>(null);
  const shown = drag?.width ?? width;
  const edge: Omit<PanelEdgeProps, 'onCollapse'> = {
    width: shown,
    defaultWidth,
    onWidth: (next) => {
      setWidth(next);
      savePanelWidth(storageKey, next);
    },
    onDrag: setDrag,
  };
  return { width: shown, collapsing: drag?.collapsing ?? false, edge };
}
