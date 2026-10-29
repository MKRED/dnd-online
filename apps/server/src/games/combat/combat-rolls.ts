import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { D20Roll, RollMode } from 'shared';
import { gameCombatants } from '../../database/schema/index.js';
import { appendGameEvent } from '../game-journal.js';
import {
  asOf,
  assertMaster,
  drives,
  isMaster,
  type CombatActor,
} from './combat-actor.js';
import {
  COMBAT_ORDER_MISMATCH,
  COMBATANT_NOT_FOUND,
  INITIATIVE_ALREADY,
  INITIATIVE_NOT_YOURS,
  MASTER_ONLY_ROLL_MODE,
} from './combat-errors.js';
import { initiativeInputOf, rollInitiative } from './combat-initiative.js';
import {
  placeInOrder,
  startTurnsIfReady,
  writePlaces,
} from './combat-turns.js';
import { combatantVisibility } from './combat-visibility.js';
import {
  eventCombatant,
  loadCombat,
  rolledOf,
  type LiveCombatant,
} from './combatant-read.js';

// Инициатива и очередь (docs/plan/combat.md, «Инициатива»): игрок бросает за свою
// фигурку, мастер — за кого угодно и за всех существ разом, правит число и переставляет.

async function findCombatant(actor: CombatActor, combatantId: string) {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const c = state.combatants.find((x) => x.row.id === combatantId);
  if (!c) throw new NotFoundException(COMBATANT_NOT_FOUND);
  return { state, c };
}

async function rollOne(
  actor: CombatActor,
  c: LiveCombatant,
  mode: RollMode | null,
): Promise<D20Roll> {
  const { tx, gameId, scene } = actor;
  const { roll, modifier } = await rollInitiative(
    tx,
    gameId,
    scene.id,
    c,
    mode,
  );
  await tx
    .update(gameCombatants)
    .set({ initiative: roll.total, modifier, roll })
    .where(eq(gameCombatants.id, c.row.id));
  // Место — по очереди на момент броска: бросок мог прийти вслед за другим в той же
  // транзакции (бросок за всех существ).
  const state = await loadCombat(tx, gameId, scene.id);
  const place = await placeInOrder(tx, state, c.row.id, {
    initiative: roll.total,
    modifier,
  });
  await appendGameEvent(tx, gameId, {
    kind: 'combat.initiative',
    actorId: actor.userId,
    as: asOf(actor, c),
    sceneId: scene.id,
    intent: { combatantId: c.row.id, mode },
    result: { combatant: eventCombatant(c), roll, place },
    visibility: await combatantVisibility(tx, gameId, scene.id, c),
  });
  return roll;
}

// «Бросить кубик» в окне броска: mode — переключатель мастера.
export async function rollFor(
  actor: CombatActor,
  combatantId: string,
  mode: RollMode | null,
): Promise<D20Roll> {
  if (mode !== null && !isMaster(actor)) {
    throw new ForbiddenException(MASTER_ONLY_ROLL_MODE);
  }
  const { c } = await findCombatant(actor, combatantId);
  if (!drives(actor, c)) throw new ForbiddenException(INITIATIVE_NOT_YOURS);
  if (c.row.initiative !== null) {
    throw new ConflictException(INITIATIVE_ALREADY);
  }
  const roll = await rollOne(actor, c, mode);
  await startTurnsIfReady(actor);
  return roll;
}

// «Бросить за монстров» и «Бросить за героев»: все не бросившие монстры и НПС или герои,
// каждый отдельно (домашнее правило, docs/dnd/combat.md). За героев — тех, чьи игроки
// отошли (решение Михаила 2026-10-28, вариант А макета «Бросок за героев»).
export async function rollWaiting(
  actor: CombatActor,
  who: 'creatures' | 'heroes',
): Promise<number> {
  assertMaster(actor);
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const waiting = state.combatants.filter(
    (c) =>
      (who === 'creatures') === Boolean(c.creature) &&
      c.row.initiative === null,
  );
  for (const c of waiting) await rollOne(actor, c, null);
  await startTurnsIfReady(actor);
  return waiting.length;
}

// Мастер ставит число сам (бросок вживую, ошибка): участник встаёт в очередь заново.
export async function setInitiative(
  actor: CombatActor,
  combatantId: string,
  initiative: number,
) {
  assertMaster(actor);
  const { tx, gameId, scene } = actor;
  const { state, c } = await findCombatant(actor, combatantId);
  const modifier =
    c.row.modifier ??
    (await initiativeInputOf(tx, gameId, scene.id, c)).modifier;
  await tx
    .update(gameCombatants)
    .set({ initiative, modifier })
    .where(eq(gameCombatants.id, c.row.id));
  const place = await placeInOrder(tx, state, c.row.id, {
    initiative,
    modifier,
  });
  await appendGameEvent(tx, gameId, {
    kind: 'combat.initiative_set',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: scene.id,
    intent: { combatantId, initiative },
    result: {
      combatant: eventCombatant(c),
      before: c.row.initiative,
      place,
    },
    visibility: await combatantVisibility(tx, gameId, scene.id, c),
  });
  await startTurnsIfReady(actor);
}

// Мастер переставляет очередь: ids — все бросившие, каждый по разу.
export async function reorder(actor: CombatActor, ids: readonly string[]) {
  assertMaster(actor);
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const rolled = new Set(rolledOf(state).map((c) => c.row.id));
  if (
    ids.length !== rolled.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !rolled.has(id))
  ) {
    throw new BadRequestException(COMBAT_ORDER_MISMATCH);
  }
  await writePlaces(actor.tx, ids);
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.order',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.scene.id,
    intent: { ids: [...ids] },
    result: { count: ids.length },
  });
}
