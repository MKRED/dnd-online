import { eq } from 'drizzle-orm';
import { creatureSeen, type GameEventVisibility, type Vec3 } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import { loadFog } from '../fog/index.js';
import { findActiveScene } from '../scenes/scene-read.js';

// Видели ли игроки существо, когда с ним что-то случилось (журнал после первой партии,
// 2026-10-26): запись о его хитах или ходе видна игрокам, только если да. Правило то же,
// что у меток здоровья на сцене (creature-read.ts): не скрыто мастером, сцена активная и
// открыта игрокам, под туманом — в поле зрения группы. cells — где его могли видеть:
// клетка, а у хода — весь путь (туман от хода существа не меняется: оно не смотрит).
export async function creatureEventVisibility(
  tx: DbTransaction,
  gameId: string,
  sceneId: string,
  creature: { hidden: boolean },
  cells: Vec3[],
): Promise<GameEventVisibility> {
  if (creature.hidden) return 'master';
  const [game] = await tx
    .select({ sceneOpen: games.sceneOpen })
    .from(games)
    .where(eq(games.id, gameId));
  if (!game?.sceneOpen) return 'master';
  const scene = await findActiveScene(tx, gameId);
  if (scene?.id !== sceneId) return 'master';
  if (!scene.fog) return 'players';
  const fog = await loadFog(tx, sceneId);
  return cells.some((cell) => creatureSeen(cell, fog)) ? 'players' : 'master';
}
