import {
  parseChunkKey,
  type CellMask,
  type FogChunkBits,
  type FogMasks,
  type GameSceneFogView,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { loadFog } from './fog-storage.js';

// Туман игрока на сцене: маски, если туман включён, иначе null — видно всё. Мастеру его
// не передают: он видит сцену целиком.
export async function playerFog(
  db: Db,
  scene: SceneRow,
): Promise<FogMasks | null> {
  return scene.fog ? loadFog(db, scene.id) : null;
}

function chunkBits(mask: CellMask): FogChunkBits[] {
  return [...mask].map(([key, bits]) => {
    const [cx, cy, cz] = parseChunkKey(key);
    return { cx, cy, cz, bits: Buffer.from(bits).toString('base64') };
  });
}

export function fogView(fog: FogMasks): GameSceneFogView {
  return { explored: chunkBits(fog.explored), visible: chunkBits(fog.visible) };
}
