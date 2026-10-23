import {
  movementAllowance,
  type GameCreature,
  type GameFigure,
  type MapObject,
} from 'shared';
import type { Participant } from './ParticipantRow';

// Герои вкладки «Участники»: числа хитов — тем, кто водит фигурку (сервер отдаёт их только
// им), запас — тоже им; остальным только метка здоровья.
export function heroParticipants(
  figures: readonly GameFigure[],
): Participant[] {
  return figures.map((figure) => ({
    key: figure.character.id,
    kind: 'pc',
    name: figure.character.name,
    hitPoints: figure.hitPoints,
    health: figure.health,
    feetLeft: figure.canMove ? movementAllowance(figure).walk : null,
    hidden: false,
    selectable: figure.canMove,
  }));
}

// Монстры и НПС у мастера: состояние экземпляра есть только у него. Поверженный не
// ходит — запас не показываем.
export function creatureParticipants(
  creatures: readonly GameCreature[],
  objectOf: (objectId: number) => MapObject | undefined,
): Participant[] {
  return creatures.flatMap(({ objectId, state, health }) => {
    if (!state) return [];
    const object = objectOf(objectId);
    return [
      {
        key: String(objectId),
        kind: object?.kind === 'npc' ? 'npc' : 'monster',
        name: state.name,
        hitPoints: state.hitPoints,
        health,
        feetLeft:
          health === 'down' || health === 'dead'
            ? null
            : movementAllowance(state.movement).walk,
        hidden: object?.hidden ?? false,
        selectable: true,
      } satisfies Participant,
    ];
  });
}
