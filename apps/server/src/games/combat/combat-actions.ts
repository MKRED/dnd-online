import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type {
  CombatAction,
  CombatResourcesInput,
  CombatResourcesUsed,
} from 'shared';
import {
  gameCombatants,
  gameCreatures,
  gameFigures,
} from '../../database/schema/index.js';
import { appendGameEvent } from '../game-journal.js';
import {
  asOf,
  assertMaster,
  drives,
  type CombatActor,
} from './combat-actor.js';
import {
  ACTION_NOT_YOURS,
  ALREADY_DISENGAGED,
  ALREADY_DODGING,
  COMBATANT_NOT_FOUND,
  NO_ACTIONS_LEFT,
  NOT_YOUR_TURN,
  RESOURCES_OVER_MAX,
} from './combat-errors.js';
import { turnLimitsOf } from './combat-resources.js';
import { combatantVisibility } from './combat-visibility.js';
import {
  eventCombatant,
  loadCombat,
  type LiveCombatant,
} from './combatant-read.js';

// Обычные действия хода и правка потраченного мастером (docs/plan/combat.md, этап 4;
// правила — docs/dnd/combat.md).

async function findCombatant(actor: CombatActor, combatantId: string) {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const c = state.combatants.find((x) => x.row.id === combatantId);
  if (!c) throw new NotFoundException(COMBATANT_NOT_FOUND);
  const limits = (await turnLimitsOf(actor.tx, [c])).get(c.row.id)!;
  return { state, c, limits };
}

// «Рывок»: ещё одна Скорость к запасу этого хода. Строки существа может ещё не быть — она
// появляется с полными хитами, как у правки запаса мастером.
async function dash(actor: CombatActor, c: LiveCombatant): Promise<number> {
  if (c.ref.kind === 'figure') {
    const [row] = await actor.tx
      .update(gameFigures)
      .set({ dashes: sql`${gameFigures.dashes} + 1` })
      .where(eq(gameFigures.characterId, c.ref.characterId))
      .returning({ dashes: gameFigures.dashes });
    return row.dashes;
  }
  const [row] = await actor.tx
    .insert(gameCreatures)
    .values({
      sceneId: actor.scene.id,
      objectId: c.ref.objectId,
      hitPointsCurrent: c.creature!.max,
      dashes: 1,
    })
    .onConflictDoUpdate({
      target: [gameCreatures.sceneId, gameCreatures.objectId],
      set: { dashes: sql`${gameCreatures.dashes} + 1` },
    })
    .returning({ dashes: gameCreatures.dashes });
  return row.dashes;
}

// Действие тратит одно действие и только в свой ход: и у игрока, и у мастера за монстра.
export async function takeAction(
  actor: CombatActor,
  combatantId: string,
  action: CombatAction,
) {
  const { state, c, limits } = await findCombatant(actor, combatantId);
  if (!drives(actor, c)) throw new ForbiddenException(ACTION_NOT_YOURS);
  if (state.turn !== c.row.id) throw new ConflictException(NOT_YOUR_TURN);
  if (c.row.actionsUsed >= limits.actions) {
    throw new ConflictException(NO_ACTIONS_LEFT);
  }
  if (action === 'dodge' && c.row.dodging) {
    throw new ConflictException(ALREADY_DODGING);
  }
  if (action === 'disengage' && c.row.disengaged) {
    throw new ConflictException(ALREADY_DISENGAGED);
  }
  await actor.tx
    .update(gameCombatants)
    .set({
      actionsUsed: c.row.actionsUsed + 1,
      ...(action === 'dodge' && { dodging: true }),
      ...(action === 'disengage' && { disengaged: true }),
    })
    .where(eq(gameCombatants.id, c.row.id));
  const dashes = action === 'dash' ? await dash(actor, c) : null;
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.action',
    actorId: actor.userId,
    as: asOf(actor, c),
    sceneId: actor.scene.id,
    intent: { combatantId, action },
    result: { combatant: eventCombatant(c), action, dashes },
    visibility: await combatantVisibility(
      actor.tx,
      actor.gameId,
      actor.scene.id,
      c,
    ),
  });
}

// Мастер правит потраченное: вернуть ошибочно потраченное или отметить сделанное на словах.
export async function setResources(
  actor: CombatActor,
  combatantId: string,
  input: CombatResourcesInput,
) {
  assertMaster(actor);
  const { c, limits } = await findCombatant(actor, combatantId);
  const before: CombatResourcesUsed = {
    actionsUsed: c.row.actionsUsed,
    bonusActionsUsed: c.row.bonusActionsUsed,
    reactionsUsed: c.row.reactionsUsed,
  };
  const after: CombatResourcesUsed = {
    actionsUsed: input.actionsUsed ?? before.actionsUsed,
    bonusActionsUsed: input.bonusActionsUsed ?? before.bonusActionsUsed,
    reactionsUsed: input.reactionsUsed ?? before.reactionsUsed,
  };
  if (
    after.actionsUsed > limits.actions ||
    after.bonusActionsUsed > limits.bonusActions ||
    after.reactionsUsed > limits.reactions
  ) {
    throw new BadRequestException(RESOURCES_OVER_MAX);
  }
  await actor.tx
    .update(gameCombatants)
    .set(after)
    .where(eq(gameCombatants.id, c.row.id));
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.resources',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.scene.id,
    intent: { combatantId, ...input },
    result: { combatant: eventCombatant(c), before, after },
    visibility: await combatantVisibility(
      actor.tx,
      actor.gameId,
      actor.scene.id,
      c,
    ),
  });
}
