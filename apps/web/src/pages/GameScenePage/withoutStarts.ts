import type { MapViewState } from '../../features/maps/mapStateFromChunks';

// Сцена без точек старта: мастер в «Игре» видит её так же чисто, как игроки (у них старты
// убирает сервер), а в «Правке», где старты ставят и двигают, они на месте (замечания после
// первой партии, 2026-10-26, вариант А). Без стартов — та же сцена, чтобы не перестраивать.
export function withoutStarts(state: MapViewState): MapViewState {
  const starts = [...state.objects.byId.values()].some(
    (object) => object.kind === 'start',
  );
  if (!starts) return state;
  const byId = new Map(
    [...state.objects.byId].filter(([, object]) => object.kind !== 'start'),
  );
  return { ...state, objects: { ...state.objects, byId } };
}
