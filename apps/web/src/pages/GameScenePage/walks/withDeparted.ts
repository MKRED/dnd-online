import type { MapObject } from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';

// Сцена для рисования с существами, которые уходят из поля зрения игрока: правка их уже
// убрала, а ход ещё идёт — до тумана их видно (docs/plan/done/walk-animation.md). На
// правила это не влияет: правила берут сцену без них.
export function withDeparted(
  state: MapViewState,
  departed: ReadonlyMap<number, MapObject>,
): MapViewState {
  const missing = [...departed.values()].filter(
    (object) => !state.objects.byId.has(object.id),
  );
  if (missing.length === 0) return state;
  const byId = new Map(state.objects.byId);
  for (const object of missing) byId.set(object.id, object);
  return { ...state, objects: { ...state.objects, byId } };
}
