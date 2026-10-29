import { and, eq } from 'drizzle-orm';
import { initiativeSlot, nextTurn, type InitiativeRank } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  gameCombatants,
  gameCreatures,
  gameFigures,
  games,
} from '../../database/schema/index.js';
import { appendGameEvent } from '../game-journal.js';
import { asOf, type CombatActor } from './combat-actor.js';
import { fairRandom } from './combat-initiative.js';
import { combatantVisibility } from './combat-visibility.js';
import {
  eventCombatant,
  loadCombat,
  rolledOf,
  type CombatState,
  type LiveCombatant,
} from './combatant-read.js';

// Очередь и ходы боя (docs/plan/combat.md, «Очерёдность»): места в очереди, переход хода,
// новый раунд после последнего и полный запас движения в начале своего хода.

export async function writePlaces(tx: DbTransaction, ids: readonly string[]) {
  for (const [place, id] of ids.entries()) {
    await tx
      .update(gameCombatants)
      .set({ place })
      .where(eq(gameCombatants.id, id));
  }
}

const rankOf = (c: LiveCombatant): InitiativeRank => ({
  initiative: c.row.initiative ?? 0,
  modifier: c.row.modifier ?? 0,
});

// Участник встаёт в очередь по своему числу (снова — если мастер его поправил); места
// остальных переписываются по порядку. Возвращает его место с 0.
export async function placeInOrder(
  tx: DbTransaction,
  state: CombatState,
  id: string,
  rank: InitiativeRank,
): Promise<number> {
  const order = rolledOf(state).filter((c) => c.row.id !== id);
  const slot = initiativeSlot(order.map(rankOf), rank, fairRandom);
  const ids = order.map((c) => c.row.id);
  ids.splice(slot, 0, id);
  await writePlaces(tx, ids);
  return slot;
}

// Начало хода участника: он ходит, запас его движения снова полный (запас — на свой ход,
// а не на раунд у всех сразу). Действия, бонусные и реакции снова целые, его «Уклонение»
// кончилось (этап 4); «Отход» действует до конца хода — у всех остальных он снимается.
// Отметки атак этого хода снова чистые, неброшенный урон прошлого хода пропадает (этап 5).
async function giveTurn(actor: CombatActor, c: LiveCombatant, round: number) {
  const { tx } = actor;
  await tx
    .update(games)
    .set({ combatTurn: c.row.id, combatRound: round })
    .where(eq(games.id, actor.gameId));
  await tx
    .update(gameCombatants)
    .set({ disengaged: false })
    .where(eq(gameCombatants.sceneId, actor.scene.id));
  await tx
    .update(gameCombatants)
    .set({
      actionsUsed: 0,
      bonusActionsUsed: 0,
      reactionsUsed: 0,
      dodging: false,
      setSwitched: false,
      handSwapped: false,
      lightAttacked: false,
      pendingDamage: null,
    })
    .where(eq(gameCombatants.id, c.row.id));
  if (c.ref.kind === 'figure') {
    await tx
      .update(gameFigures)
      .set({ moved: 0, dashes: 0 })
      .where(eq(gameFigures.characterId, c.ref.characterId));
    return;
  }
  // Строки нет — существо ещё не ходило, запас и так полный.
  await tx
    .update(gameCreatures)
    .set({ moved: 0, dashes: 0 })
    .where(
      and(
        eq(gameCreatures.sceneId, actor.scene.id),
        eq(gameCreatures.objectId, c.ref.objectId),
      ),
    );
}

export async function turnTo(
  actor: CombatActor,
  next: LiveCombatant,
  from: LiveCombatant | null,
  how: {
    reason: 'start' | 'end' | 'pass' | 'left';
    round: number;
    newRound: boolean;
  },
) {
  await giveTurn(actor, next, how.round);
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.turn',
    actorId: actor.userId,
    as: from ? asOf(actor, from) : { kind: 'master' },
    sceneId: actor.scene.id,
    intent: { reason: how.reason, combatantId: next.row.id },
    result: {
      combatant: eventCombatant(next),
      from: from && eventCombatant(from),
      round: how.round,
      newRound: how.newRound,
    },
    visibility: await combatantVisibility(
      actor.tx,
      actor.gameId,
      actor.scene.id,
      next,
    ),
  });
}

// Все бросили инициативу — первый в очереди начинает первый раунд.
export async function startTurnsIfReady(actor: CombatActor) {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  if (state.turn !== null) return;
  if (state.combatants.some((c) => c.row.initiative === null)) return;
  const [first] = rolledOf(state);
  if (!first) return;
  await turnTo(actor, first, null, {
    reason: 'start',
    round: state.round ?? 1,
    newRound: true,
  });
}

// Ход переходит к следующему в очереди; после последнего начинается новый раунд.
// Ходивший один в очереди — ход снова его, тоже в новом раунде.
export async function advanceTurn(
  actor: CombatActor,
  state: CombatState,
  reason: 'end' | 'left',
) {
  const order = rolledOf(state);
  const current = order.find((c) => c.row.id === state.turn) ?? null;
  const step = nextTurn(order, current);
  if (!step) return;
  const round = (state.round ?? 1) + (step.wrapped ? 1 : 0);
  await turnTo(actor, step.next, current, {
    reason,
    round,
    newRound: step.wrapped,
  });
}
