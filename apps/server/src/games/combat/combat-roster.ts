import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { CombatantInput, CombatantRef } from 'shared';
import {
  gameCombatants,
  gameCreatures,
  gameFigures,
  games,
} from '../../database/schema/index.js';
import { loadSceneCreatures } from '../creatures/creature-read.js';
import { appendGameEvent } from '../game-journal.js';
import { readMoveMode } from '../figures/move-mode-read.js';
import { setMoveMode } from '../figures/move-mode.js';
import { assertMaster, type CombatActor } from './combat-actor.js';
import {
  COMBAT_ALREADY,
  COMBAT_NOT_STARTED,
  COMBATANT_ALREADY,
  COMBATANT_NOT_FOUND,
  COMBATANT_NOT_ON_SCENE,
  COMBATANT_TWICE,
} from './combat-errors.js';
import { advanceTurn, startTurnsIfReady, writePlaces } from './combat-turns.js';
import { combatantVisibility } from './combat-visibility.js';
import { eventCombatant, loadCombat, rolledOf } from './combatant-read.js';

// Кто в бою (docs/plan/combat.md, «Инициатива»): мастер зовёт участников окном «Начать
// бой», добавляет новичка в идущий бой и убирает ушедшего.

const refKey = (ref: CombatantRef) =>
  ref.kind === 'figure' ? `f:${ref.characterId}` : `c:${ref.objectId}`;

// Участники есть на активной сцене и не повторяются.
async function assertOnScene(
  actor: CombatActor,
  participants: readonly CombatantInput[],
) {
  const keys = participants.map(refKey);
  if (new Set(keys).size !== keys.length) {
    throw new BadRequestException(COMBATANT_TWICE);
  }
  const figureIds = participants.flatMap((p) =>
    p.kind === 'figure' ? [p.characterId] : [],
  );
  const figures =
    figureIds.length === 0
      ? []
      : await actor.tx
          .select({ id: gameFigures.characterId })
          .from(gameFigures)
          .where(
            and(
              eq(gameFigures.sceneId, actor.scene.id),
              inArray(gameFigures.characterId, figureIds),
            ),
          );
  const creatures = participants.some((p) => p.kind === 'creature')
    ? await loadSceneCreatures(actor.tx, actor.gameId, actor.scene.id)
    : [];
  for (const p of participants) {
    const found =
      p.kind === 'figure'
        ? figures.some((f) => f.id === p.characterId)
        : creatures.some((c) => c.objectId === p.objectId);
    if (!found) throw new NotFoundException(COMBATANT_NOT_ON_SCENE);
  }
}

// Строки участников, которых на сцене уже нет (персонаж ушёл, объект убрали), мешали бы
// позвать их снова: перед вставкой их убираем.
async function insertCombatants(
  actor: CombatActor,
  participants: readonly CombatantInput[],
) {
  const { tx } = actor;
  const figureIds = participants.flatMap((p) =>
    p.kind === 'figure' ? [p.characterId] : [],
  );
  const objectIds = participants.flatMap((p) =>
    p.kind === 'creature' ? [p.objectId] : [],
  );
  await tx
    .delete(gameCombatants)
    .where(
      and(
        eq(gameCombatants.sceneId, actor.scene.id),
        or(
          figureIds.length > 0
            ? inArray(gameCombatants.characterId, figureIds)
            : undefined,
          objectIds.length > 0
            ? inArray(gameCombatants.objectId, objectIds)
            : undefined,
        ),
      ),
    );
  // Порядок вызова сохраняется: у не бросивших он и есть порядок в списке.
  for (const p of participants) {
    await tx.insert(gameCombatants).values({
      gameId: actor.gameId,
      sceneId: actor.scene.id,
      characterId: p.kind === 'figure' ? p.characterId : null,
      objectId: p.kind === 'creature' ? p.objectId : null,
      surprised: p.surprised,
    });
  }
}

// «Начать бой»: тактический режим, раунд 1, у всех полный запас; участники бросают
// инициативу. Из боя без очерёдности (старый «Начать бой») — тоже можно.
export async function startCombat(
  actor: CombatActor,
  participants: readonly CombatantInput[],
) {
  assertMaster(actor);
  const { tx } = actor;
  const state = await loadCombat(tx, actor.gameId, actor.scene.id);
  if (state.combatants.length > 0) {
    throw new ConflictException(COMBAT_ALREADY);
  }
  await assertOnScene(actor, participants);
  if ((await readMoveMode(tx, actor.gameId)).mode === 'free') {
    await setMoveMode(actor, 'tactical');
  } else {
    await tx
      .update(games)
      .set({ combatRound: 1 })
      .where(eq(games.id, actor.gameId));
    await tx
      .update(gameFigures)
      .set({ moved: 0, dashes: 0 })
      .where(eq(gameFigures.gameId, actor.gameId));
    await tx
      .update(gameCreatures)
      .set({ moved: 0, dashes: 0 })
      .where(eq(gameCreatures.sceneId, actor.scene.id));
  }
  await tx
    .delete(gameCombatants)
    .where(eq(gameCombatants.sceneId, actor.scene.id));
  await tx
    .update(games)
    .set({ combatTurn: null })
    .where(eq(games.id, actor.gameId));
  await insertCombatants(actor, participants);
  await appendGameEvent(tx, actor.gameId, {
    kind: 'combat.started',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.scene.id,
    intent: { count: participants.length },
    result: {
      scene: { id: actor.scene.id, name: actor.scene.name },
      count: participants.length,
    },
  });
}

// Новичок в идущем бою: бросит инициативу и встанет в очередь по числу.
export async function joinCombat(
  actor: CombatActor,
  participants: readonly CombatantInput[],
) {
  assertMaster(actor);
  const { tx } = actor;
  const before = await loadCombat(tx, actor.gameId, actor.scene.id);
  if (before.combatants.length === 0) {
    throw new ConflictException(COMBAT_NOT_STARTED);
  }
  const present = new Set(before.combatants.map((c) => refKey(c.ref)));
  if (participants.some((p) => present.has(refKey(p)))) {
    throw new ConflictException(COMBATANT_ALREADY);
  }
  await assertOnScene(actor, participants);
  await insertCombatants(actor, participants);
  const after = await loadCombat(tx, actor.gameId, actor.scene.id);
  const keys = new Set(participants.map(refKey));
  for (const c of after.combatants.filter((x) => keys.has(refKey(x.ref)))) {
    await appendGameEvent(tx, actor.gameId, {
      kind: 'combat.joined',
      actorId: actor.userId,
      as: { kind: 'master' },
      sceneId: actor.scene.id,
      intent: { ...c.ref, surprised: c.row.surprised },
      result: { combatant: eventCombatant(c) },
      visibility: await combatantVisibility(
        tx,
        actor.gameId,
        actor.scene.id,
        c,
      ),
    });
  }
}

// Мастер убирает участника. Шёл его ход — ход переходит к следующему; он был последним
// не бросившим — начинаются ходы.
export async function leaveCombat(actor: CombatActor, combatantId: string) {
  assertMaster(actor);
  const { tx } = actor;
  const state = await loadCombat(tx, actor.gameId, actor.scene.id);
  const c = state.combatants.find((x) => x.row.id === combatantId);
  if (!c) throw new NotFoundException(COMBATANT_NOT_FOUND);
  const order = rolledOf(state);
  const current = state.turn === c.row.id;
  await tx.delete(gameCombatants).where(eq(gameCombatants.id, c.row.id));
  await writePlaces(
    tx,
    order.filter((x) => x !== c).map((x) => x.row.id),
  );
  await appendGameEvent(tx, actor.gameId, {
    kind: 'combat.left',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.scene.id,
    intent: { combatantId },
    result: {
      combatant: eventCombatant(c),
      turnPassed: current && order.length > 1,
    },
    visibility: await combatantVisibility(tx, actor.gameId, actor.scene.id, c),
  });
  if (!current) {
    await startTurnsIfReady(actor);
    return;
  }
  if (order.length > 1) {
    await advanceTurn(actor, state, 'left');
    return;
  }
  await tx
    .update(games)
    .set({ combatTurn: null })
    .where(eq(games.id, actor.gameId));
}
