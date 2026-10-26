import {
  movementAllowance,
  type GameCreature,
  type GameFigure,
  type MapObject,
  type MapObjectRefsView,
} from 'shared';
import { figureImagePath } from '../../../features/games';
import type { ObjectImagePaths } from '../../../features/maps/MapScene';
import type { Participant } from './ParticipantRow';

// Миниатюра монстра или НПС — та же, что на карточке на сцене (objectLayout): из
// библиотеки игры по ссылке объекта. null — картинки нет.
export function creaturePortrait(
  object: MapObject | undefined,
  refs: MapObjectRefsView,
  images: ObjectImagePaths,
): string | null {
  if (object?.kind === 'monster') {
    const ref = refs.monsters[object.monsterId];
    return ref?.missing === null && ref.image
      ? images.monster(object.monsterId, ref.image.version)
      : null;
  }
  if (object?.kind === 'npc') {
    const ref = refs.npcs[object.characterId];
    return ref?.missing === null && ref.mainImage
      ? images.npc(object.characterId, ref.mainImage)
      : null;
  }
  return null;
}

// Герои вкладки «Участники»: числа хитов — тем, кто водит фигурку (сервер отдаёт их только
// им), запас — тоже им; остальным только метка здоровья.
export function heroParticipants(
  figures: readonly GameFigure[],
  gameId: string,
): Participant[] {
  return figures.map((figure) => ({
    key: figure.character.id,
    image: figureImagePath(gameId, figure),
    kind: 'pc',
    name: figure.character.name,
    hitPoints: figure.hitPoints,
    health: figure.health,
    feetLeft: figure.canMove ? movementAllowance(figure).walk : null,
    hidden: false,
    selectable: figure.canMove,
    group: 'pc',
    kin: null,
  }));
}

// Уникальный ли монстр в справочнике (роль «Уникальный»): такие — своей группой.
export function isUniqueMonster(
  object: MapObject | undefined,
  refs: MapObjectRefsView,
): boolean {
  if (object?.kind !== 'monster') return false;
  const ref = refs.monsters[object.monsterId];
  return ref?.missing === null && ref.role === 'unique';
}

// Одинаковые существа — одна запись справочника: их строки сворачиваются в одну.
function kinOf(object: MapObject | undefined): string | null {
  if (object?.kind === 'monster') return `monster:${object.monsterId}`;
  if (object?.kind === 'npc') return `npc:${object.characterId}`;
  return null;
}

// Монстры и НПС у мастера: состояние экземпляра есть только у него. Поверженный не
// ходит — запас не показываем.
export function creatureParticipants(
  creatures: readonly GameCreature[],
  objectOf: (objectId: number) => MapObject | undefined,
  portraitOf: (object: MapObject | undefined) => string | null,
  uniqueOf: (object: MapObject | undefined) => boolean = () => false,
): Participant[] {
  return creatures.flatMap(({ objectId, state, health }) => {
    if (!state) return [];
    const object = objectOf(objectId);
    const npc = object?.kind === 'npc';
    return [
      {
        key: String(objectId),
        image: portraitOf(object),
        kind: npc ? 'npc' : 'monster',
        name: state.name,
        hitPoints: state.hitPoints,
        health,
        feetLeft:
          health === 'down' || health === 'dead'
            ? null
            : movementAllowance(state.movement).walk,
        hidden: object?.hidden ?? false,
        selectable: true,
        group: npc ? 'npc' : uniqueOf(object) ? 'unique' : 'monster',
        kin: kinOf(object),
      } satisfies Participant,
    ];
  });
}
