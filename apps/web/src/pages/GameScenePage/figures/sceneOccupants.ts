import {
  healthDown,
  type CreatureHealth,
  type MapObjectRefsView,
  type Occupant,
} from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';

// Существа карты, которые мешают фигурке (docs/dnd/movement.md): монстры и НПС, видные
// смотрящему. Игроку скрытых сервер не отдаёт — и его ход их не учитывает, так же
// считает и сервер. Сквозь поверженного (метка здоровья health) проходят. skip — само
// существо, которое ходит (docs/plan/done/creature-movement.md).
export function sceneOccupants(
  state: MapViewState,
  refs: MapObjectRefsView,
  health: ReadonlyMap<number, CreatureHealth>,
  skip?: number,
): Occupant[] {
  return [...state.objects.byId.values()].flatMap((object): Occupant[] => {
    if (object.id === skip) return [];
    const incapacitated = healthDown(health.get(object.id) ?? null);
    if (object.kind === 'monster') {
      const size = refs.monsters[object.monsterId]?.size ?? 'medium';
      return [{ at: object.at, size, ally: false, incapacitated }];
    }
    if (object.kind === 'npc') {
      return [{ at: object.at, size: object.size, ally: false, incapacitated }];
    }
    return [];
  });
}
