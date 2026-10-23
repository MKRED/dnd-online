import { useMemo } from 'react';
import {
  buildFurnitureLayer,
  objectRefsFromView,
  type MapObjectRefsView,
  type ObjectRefs,
} from 'shared';
import type { MapViewState } from './mapStateFromChunks';

// Карта глазами правил (docs/plan/blocks.md, этап 8в2): с клетками обстановки — путь,
// высота ног и обзор видят столы и шкафы так же, как сервер. Справочник — отдельной
// памятью: склейка вокселей кэшируется по его записям и не пересчитывается на каждую
// правку блоков.
export function useRulesState<S extends MapViewState>(
  state: S | null,
  view: MapObjectRefsView | null,
): { state: S | null; refs: ObjectRefs | null } {
  const refs = useMemo(() => (view ? objectRefsFromView(view) : null), [view]);
  const rules = useMemo(
    () =>
      state && refs
        ? {
            ...state,
            furniture: buildFurnitureLayer(state.objects.byId.values(), refs),
          }
        : state,
    [state, refs],
  );
  return { state: rules, refs };
}
