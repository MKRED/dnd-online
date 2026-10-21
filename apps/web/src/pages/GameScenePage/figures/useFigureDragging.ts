import { useCallback, useRef } from 'react';
import { FIGURE_DRAG_INTERVAL_MS, type Vec3 } from 'shared';
import type { PickedCells } from '../../../features/maps/editor/editorTools';
import type { WalkHover } from '../../../features/maps/walkTest';

interface FigureDraggingOptions {
  selectedId: string | null;
  select: (id: string | null) => void;
  preview: (cells: PickedCells) => WalkHover | null;
  pick: (cells: PickedCells) => void;
  // Куда тянут фигурку — остальным по сокету; null — отпустили.
  onDrag?: (characterId: string, at: Vec3 | null) => void;
}

// Перетаскивание выбранной фигурки мышью (docs/plan/done/game.md, этап 7). Нажатие выбирает
// фигурку; пока её тянут, клетка под курсором (onHover из EditLayer) уходит остальным не
// чаще FIGURE_DRAG_INTERVAL_MS; отпускание делает то же, что щелчок по этой клетке, — ход
// или постановку. Нажатие без сдвига по уже выбранной фигурке снимает выбор.
export function useFigureDragging({
  selectedId,
  select,
  preview,
  pick,
  onDrag,
}: FigureDraggingOptions) {
  const dragging = useRef<string | null>(null);
  const wasSelected = useRef(false);
  const lastCells = useRef<PickedCells | null>(null);
  const sentAt = useRef(0);
  const sent = useRef(false);

  const grab = useCallback(
    (id: string) => {
      wasSelected.current = selectedId === id;
      dragging.current = id;
      lastCells.current = null;
      sent.current = false;
      select(id);
    },
    [selectedId, select],
  );

  const release = useCallback(
    (dragged: boolean) => {
      const id = dragging.current;
      dragging.current = null;
      if (!id) return;
      if (sent.current) onDrag?.(id, null);
      if (dragged && lastCells.current) pick(lastCells.current);
      else if (!dragged && wasSelected.current) select(null);
    },
    [onDrag, pick, select],
  );

  const onHover = useCallback(
    (cells: PickedCells | null) => {
      lastCells.current = cells;
      const id = dragging.current;
      if (!id || !cells || !onDrag) return;
      const now = Date.now();
      if (now - sentAt.current < FIGURE_DRAG_INTERVAL_MS) return;
      const hover = preview(cells);
      if (!hover || hover.kind === 'blocked') return;
      sentAt.current = now;
      sent.current = true;
      onDrag(id, hover.anchor);
    },
    [preview, onDrag],
  );

  return { grab, release, onHover };
}
