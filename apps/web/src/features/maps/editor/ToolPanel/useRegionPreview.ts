import { useMemo, useSyncExternalStore } from 'react';
import type { SizedMapState, Vec3 } from 'shared';
import type { HoverStore } from '../../MapScene/hoverStore';
import { anchorBox } from '../editorTools';
import { regionPreview, type RegionPreview } from '../regionPreview';
import type { MapEditor } from '../useMapEditor';

const noHover = {
  get: () => null,
  subscribe: () => () => undefined,
};

// Клетка под курсором из строки координат сцены. Подписка — только у тех, кому она
// нужна (карточка угла, «Под курсором», плашка): страница на движение мыши не
// перерисовывается.
export function useHoverCell(hover: HoverStore | null): Vec3 | null {
  const store = hover ?? noHover;
  return useSyncExternalStore(store.subscribe, store.get);
}

// Что сделает второй щелчок по клетке под курсором; null — угол не выбран или курсор
// не над картой.
export function useRegionPreview(
  editor: MapEditor,
  state: SizedMapState | null,
  hover: HoverStore | null,
): RegionPreview | null {
  const cell = useHoverCell(hover);
  const { sceneEditor, anchor, tool, eraseMode } = editor;
  return useMemo(() => {
    if (!state || !sceneEditor || !anchor || !cell) return null;
    const box = anchorBox(sceneEditor, cell);
    return box
      ? regionPreview(state, { tool, eraseMode, box, match: anchor.match })
      : null;
  }, [state, sceneEditor, anchor, cell, tool, eraseMode]);
}
