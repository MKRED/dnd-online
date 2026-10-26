import { eq, sql } from 'drizzle-orm';
import { chunkKey, MASK_BYTES, parseChunkKey, type CellMask } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import type { DbTransaction } from '../../database/database.service.js';
import { gameSceneFog } from '../../database/schema/index.js';

// Туман сцены в базе: две маски по чанку (schema/game-scenes.ts, game_scene_fog).
export interface SceneFog {
  explored: CellMask;
  visible: CellMask;
}

const EMPTY = new Uint8Array(MASK_BYTES);

export async function loadFog(db: Db, sceneId: string): Promise<SceneFog> {
  const rows = await db
    .select()
    .from(gameSceneFog)
    .where(eq(gameSceneFog.sceneId, sceneId));
  const fog: SceneFog = { explored: new Map(), visible: new Map() };
  for (const { cx, cy, cz, explored, visible } of rows) {
    const key = chunkKey(cx, cy, cz);
    fog.explored.set(key, new Uint8Array(explored));
    fog.visible.set(key, new Uint8Array(visible));
  }
  return fog;
}

const sameBits = (a: Uint8Array | undefined, b: Uint8Array | undefined) =>
  (a ?? EMPTY).every((byte, i) => byte === (b ?? EMPTY)[i]);

const toBuffer = (bits: Uint8Array | undefined) => Buffer.from(bits ?? EMPTY);

// Пишет только изменившиеся чанки. «Открыто» только растёт, поэтому строки не
// удаляются: чанк, однажды открытый, остаётся в таблице до перезапуска сцены (новая
// копия — новые строки) или до сброса тумана мастером (clearFog).
export async function saveFog(
  tx: DbTransaction,
  sceneId: string,
  before: SceneFog,
  after: SceneFog,
): Promise<number> {
  const keys = new Set([...before.explored.keys(), ...after.explored.keys()]);
  const rows = [...keys].flatMap((key) => {
    const explored = after.explored.get(key);
    const visible = after.visible.get(key);
    if (
      sameBits(before.explored.get(key), explored) &&
      sameBits(before.visible.get(key), visible)
    ) {
      return [];
    }
    const [cx, cy, cz] = parseChunkKey(key);
    return [
      {
        sceneId,
        cx,
        cy,
        cz,
        explored: toBuffer(explored),
        visible: toBuffer(visible),
      },
    ];
  });
  if (rows.length === 0) return 0;
  await tx
    .insert(gameSceneFog)
    .values(rows)
    .onConflictDoUpdate({
      target: [
        gameSceneFog.sceneId,
        gameSceneFog.cx,
        gameSceneFog.cy,
        gameSceneFog.cz,
      ],
      set: {
        explored: sql`excluded.explored`,
        visible: sql`excluded.visible`,
      },
    });
  return rows.length;
}

// Сброс тумана мастером: открытое забыто целиком, следующий пересчёт начинает с нуля.
export async function clearFog(
  tx: DbTransaction,
  sceneId: string,
): Promise<number> {
  const removed = await tx
    .delete(gameSceneFog)
    .where(eq(gameSceneFog.sceneId, sceneId))
    .returning({ cx: gameSceneFog.cx });
  return removed.length;
}
