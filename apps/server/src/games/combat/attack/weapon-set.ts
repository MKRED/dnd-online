import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { activeWeaponSet, wornGear, type WeaponSet } from 'shared';
import { loadInventory } from '../../../characters/inventory/index.js';
import { gameCombatants } from '../../../database/schema/index.js';
import { appendGameEvent } from '../../game-journal.js';
import { asOf, drives, isMaster, type CombatActor } from '../combat-actor.js';
import {
  ACTION_NOT_YOURS,
  ATTACK_HEROES_ONLY,
  COMBATANT_NOT_FOUND,
  NOT_YOUR_TURN,
  WEAPON_SET_SAME,
  WEAPON_SET_SWITCHED,
} from '../combat-errors.js';
import { eventCombatant, loadCombat } from '../combatant-read.js';

// «Ближний | Дальний» в блоке хода (docs/plan/combat.md, «Решения к этапу 5», вопрос 1,
// вариант Б): переключить набор бесплатно, но раз за свой ход (домашнее правило,
// docs/dnd/weapons-armor.md). Мастер правит без счёта, как куклу.
export async function switchWeaponSet(
  actor: CombatActor,
  combatantId: string,
  set: WeaponSet,
) {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const c = state.combatants.find((x) => x.row.id === combatantId);
  if (!c) throw new NotFoundException(COMBATANT_NOT_FOUND);
  if (!drives(actor, c)) throw new ForbiddenException(ACTION_NOT_YOURS);
  if (c.ref.kind !== 'figure' || !c.figure) {
    throw new ConflictException(ATTACK_HEROES_ONLY);
  }
  const master = isMaster(actor);
  if (!master && state.turn !== c.row.id) {
    throw new ConflictException(NOT_YOUR_TURN);
  }
  if (!master && c.row.setSwitched) {
    throw new ConflictException(WEAPON_SET_SWITCHED);
  }
  const inventory = await loadInventory(
    actor.tx,
    c.figure.ownerId,
    c.ref.characterId,
  );
  if (activeWeaponSet(c.row.weaponSet, wornGear(inventory)) === set) {
    throw new ConflictException(WEAPON_SET_SAME);
  }
  await actor.tx
    .update(gameCombatants)
    .set({ weaponSet: set, ...(!master && { setSwitched: true }) })
    .where(eq(gameCombatants.id, c.row.id));
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.weapon_set',
    actorId: actor.userId,
    as: asOf(actor, c),
    sceneId: actor.scene.id,
    intent: { combatantId, set },
    result: { combatant: eventCombatant(c), set },
    visibility: 'players',
  });
}
