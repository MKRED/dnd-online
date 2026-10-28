import type { GameEventVisibility } from 'shared';
import { creatureEventVisibility } from '../../creatures/creature-visibility.js';
import type { CombatActor } from '../combat-actor.js';
import type { Fighter } from './attack-fighters.js';

// Запись об атаке видна игрокам, если они видели цель (атакует пока только герой, его
// видят всегда): по герою — всегда, по существу — как запись о его хитах.
export function fighterVisibility(
  actor: CombatActor,
  target: Fighter,
): Promise<GameEventVisibility> | GameEventVisibility {
  if (!target.creature) return 'players';
  return creatureEventVisibility(
    actor.tx,
    actor.gameId,
    actor.scene.id,
    target.creature,
    [target.creature.at],
  );
}
