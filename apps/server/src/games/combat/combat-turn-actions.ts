import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { assertMaster, drives, type CombatActor } from './combat-actor.js';
import {
  COMBAT_NOT_STARTED,
  COMBATANT_NOT_FOUND,
  TURN_NOT_ROLLED,
  TURN_NOT_STARTED,
  TURN_NOT_YOURS,
  TURN_PASSED,
} from './combat-errors.js';
import { advanceTurn, turnTo } from './combat-turns.js';
import { loadCombat } from './combatant-read.js';

// «Закончить ход» и передача хода мастером (docs/plan/combat.md, «Очерёдность»).

// combatantId — чей ход заканчивают: двойное нажатие или запоздавший запрос не
// закончит заодно и ход следующего.
export async function endTurn(actor: CombatActor, combatantId: string) {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  if (state.combatants.length === 0) {
    throw new ConflictException(COMBAT_NOT_STARTED);
  }
  if (state.turn === null) throw new ConflictException(TURN_NOT_STARTED);
  if (state.turn !== combatantId) throw new ConflictException(TURN_PASSED);
  const current = state.combatants.find((c) => c.row.id === state.turn)!;
  if (!drives(actor, current)) throw new ForbiddenException(TURN_NOT_YOURS);
  await advanceTurn(actor, state, 'end');
}

// Мастер отдаёт ход любому бросившему: раунд тот же.
export async function passTurn(actor: CombatActor, combatantId: string) {
  assertMaster(actor);
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const next = state.combatants.find((c) => c.row.id === combatantId);
  if (!next) throw new NotFoundException(COMBATANT_NOT_FOUND);
  if (next.row.initiative === null) {
    throw new ConflictException(TURN_NOT_ROLLED);
  }
  const from = state.combatants.find((c) => c.row.id === state.turn) ?? null;
  await turnTo(actor, next, from, {
    reason: 'pass',
    round: state.round ?? 1,
    newRound: false,
  });
}
