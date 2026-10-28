import { ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { HandChangeCost } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { gameCombatants } from '../../database/schema/index.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { HAND_NOT_YOUR_TURN, NO_ACTIONS_FOR_SWAP } from './combat-errors.js';
import { turnLimitsOf } from './combat-resources.js';
import { loadCombat } from './combatant-read.js';

// Смена в руке героя, который в бою с очерёдностью (docs/plan/combat.md, «Решения к этапу
// 5»): игрок — только в свой ход; первая смена оружия за ход бесплатно, дальше и щит —
// действие. Мастер правит без траты. Не в бою — без счёта, как раньше.
// cost — цена смены (handChangeCost); null — в руках ничего не меняется.
export async function spendHandChange(
  tx: DbTransaction,
  gameId: string,
  viewer: { userId: string; masterId: string },
  characterId: string,
  cost: (handSwapped: boolean) => HandChangeCost | null,
): Promise<HandChangeCost | null> {
  if (viewer.userId === viewer.masterId) return null;
  const scene = await findActiveScene(tx, gameId);
  if (!scene) return null;
  const state = await loadCombat(tx, gameId, scene.id);
  const c = state.combatants.find(
    (x) => x.ref.kind === 'figure' && x.ref.characterId === characterId,
  );
  if (!c || c.row.initiative === null) return null;
  const spent = cost(c.row.handSwapped);
  if (spent === null) return null;
  if (state.turn !== c.row.id) {
    throw new ConflictException(HAND_NOT_YOUR_TURN);
  }
  if (spent === 'free') {
    await tx
      .update(gameCombatants)
      .set({ handSwapped: true })
      .where(eq(gameCombatants.id, c.row.id));
    return spent;
  }
  const limits = (await turnLimitsOf(tx, [c])).get(c.row.id)!;
  if (c.row.actionsUsed >= limits.actions) {
    throw new ConflictException(NO_ACTIONS_FOR_SWAP);
  }
  await tx
    .update(gameCombatants)
    .set({ actionsUsed: c.row.actionsUsed + 1, handSwapped: true })
    .where(eq(gameCombatants.id, c.row.id));
  return spent;
}
