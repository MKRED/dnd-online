import type { GameEventVisibility } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { creatureEventVisibility } from '../creatures/creature-visibility.js';
import type { LiveCombatant } from './combatant-read.js';

// Запись боя про участника видна игрокам, если его видит партия: фигурки — всегда, существо
// — как его хиты и ход (creatures/creature-visibility.ts).
export function combatantVisibility(
  tx: DbTransaction,
  gameId: string,
  sceneId: string,
  c: LiveCombatant,
): Promise<GameEventVisibility> | GameEventVisibility {
  if (!c.creature) return 'players';
  return creatureEventVisibility(tx, gameId, sceneId, c.creature, [
    c.creature.at,
  ]);
}
