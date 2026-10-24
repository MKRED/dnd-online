import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DbTransaction } from '../../database/database.service.js';
import { clearFog } from '../fog/index.js';
import { SCENE_FOG_OFF, SCENE_NOT_FOUND } from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import { findScene } from './scene-read.js';

// Сброс тумана войны мастером — служебная кнопка для проверок: игроки забывают всё,
// что открыли на сцене. Строки тумана удаляются до записи журнала, а запись (событие
// тумана) пересчитывает его заново: открытым остаётся только то, что персонажи видят
// сейчас. Карта, фигурки и журнал правок не меняются — в отличие от перезапуска сцены.
export async function resetSceneFog(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  sceneId: string,
): Promise<boolean> {
  const scene = await findScene(tx, gameId, sceneId);
  if (!scene) throw new NotFoundException(SCENE_NOT_FOUND);
  if (!scene.fog) throw new ConflictException(SCENE_FOG_OFF);
  await clearFog(tx, sceneId);
  await appendGameEvent(tx, gameId, {
    kind: 'scene.fogReset',
    actorId: masterId,
    as: { kind: 'master' },
    sceneId,
    intent: null,
    result: { scene: { id: scene.id, name: scene.name } },
  });
  return true;
}
