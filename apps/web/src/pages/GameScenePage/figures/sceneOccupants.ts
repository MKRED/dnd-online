import type { MapObjectRefsView, Occupant } from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';

// Существа карты, которые мешают фигурке (docs/dnd/movement.md): монстры и НПС, видные
// смотрящему. Игроку скрытых сервер не отдаёт — и его ход их не учитывает, так же
// считает и сервер.
export function sceneOccupants(
  state: MapViewState,
  refs: MapObjectRefsView,
): Occupant[] {
  return [...state.objects.byId.values()].flatMap((object): Occupant[] => {
    if (object.kind === 'monster') {
      const size = refs.monsters[object.monsterId]?.size ?? 'medium';
      return [{ at: object.at, size, ally: false }];
    }
    if (object.kind === 'npc') {
      return [{ at: object.at, size: object.size, ally: false }];
    }
    return [];
  });
}
