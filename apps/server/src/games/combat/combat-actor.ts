import { ForbiddenException } from '@nestjs/common';
import type { GameEventAs } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { canMoveFigure } from '../figures/figure-read.js';
import { MASTER_ONLY_COMBAT } from './combat-errors.js';
import type { LiveCombatant } from './combatant-read.js';

// Кто правит бой: транзакция под lockGame на активной сцене.
export interface CombatActor {
  tx: DbTransaction;
  gameId: string;
  userId: string;
  masterId: string;
  scene: SceneRow;
}

export const isMaster = (actor: CombatActor) => actor.userId === actor.masterId;

export function assertMaster(actor: CombatActor) {
  if (!isMaster(actor)) throw new ForbiddenException(MASTER_ONLY_COMBAT);
}

// Водит ли смотрящий участника: мастер — всех, игрок — фигурку, как её ход.
export const drives = (
  viewer: { userId: string; masterId: string },
  c: LiveCombatant,
) =>
  viewer.userId === viewer.masterId ||
  (c.figure !== null &&
    canMoveFigure(
      viewer.userId,
      viewer.masterId,
      c.figure.ownerId,
      c.figure.controllerId,
    ));

// От чьего имени запись: мастер — мастер, игрок — персонаж своей фигурки.
export const asOf = (actor: CombatActor, c: LiveCombatant): GameEventAs =>
  isMaster(actor) || c.ref.kind !== 'figure'
    ? { kind: 'master' }
    : { kind: 'character', id: c.ref.characterId };
