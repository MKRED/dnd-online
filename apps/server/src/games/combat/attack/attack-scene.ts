import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { creatureSeen, type FogMasks } from 'shared';
import { playerFog } from '../../fog/fog-view.js';
import { loadSceneWorld, type SceneWorld } from '../../figures/scene-world.js';
import { drives, isMaster, type CombatActor } from '../combat-actor.js';
import {
  ACTION_NOT_YOURS,
  ATTACK_HEROES_ONLY,
  COMBATANT_NOT_FOUND,
} from '../combat-errors.js';
import {
  loadCombat,
  type CombatState,
  type LiveCombatant,
} from '../combatant-read.js';
import { loadSceneFighters, sameRef, type Fighter } from './attack-fighters.js';

// Атакующий герой со всей сценой вокруг (docs/plan/combat.md, этап 5): очередь, карта,
// существа для правил атаки и туман игроков — для списка целей и для броска.
export interface AttackScene {
  state: CombatState;
  c: LiveCombatant;
  world: SceneWorld;
  fighters: Fighter[];
  attacker: Fighter;
  fog: FogMasks | null;
}

export async function loadAttackScene(
  actor: CombatActor,
  combatantId: string,
): Promise<AttackScene> {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const c = state.combatants.find((x) => x.row.id === combatantId);
  if (!c) throw new NotFoundException(COMBATANT_NOT_FOUND);
  if (!drives(actor, c)) throw new ForbiddenException(ACTION_NOT_YOURS);
  if (c.ref.kind !== 'figure') throw new ConflictException(ATTACK_HEROES_ONLY);
  const world = await loadSceneWorld(actor.tx, actor.scene);
  const fighters = await loadSceneFighters(
    actor.tx,
    actor.gameId,
    actor.masterId,
    actor.scene,
    world,
  );
  const attacker = fighters.find((f) => sameRef(f.ref, c.ref));
  if (!attacker) throw new NotFoundException(COMBATANT_NOT_FOUND);
  const fog = isMaster(actor) ? null : await playerFog(actor.tx, actor.scene);
  return { state, c, world, fighters, attacker, fog };
}

// Цель видна тому, кто атакует: мастеру — любая, игроку — герои и существа, которых видит
// партия (не скрытые мастером и в поле зрения под туманом), как на сцене.
export const targetVisible = (
  actor: CombatActor,
  fighter: Fighter,
  fog: FogMasks | null,
) =>
  isMaster(actor) ||
  fighter.party ||
  (!fighter.hidden && creatureSeen(fighter.creature!.at, fog));

// Уклоняется ли цель: только участник боя с «Уклонением».
export const dodgingOf = (state: CombatState, fighter: Fighter) =>
  state.combatants.some((c) => sameRef(c.ref, fighter.ref) && c.row.dodging);
