import type { FogChunkBits, GameSceneFogView } from 'shared';

// Туман войны игрока (docs/plan/fog-of-war.md, этап 4): сервер присылает только чанки
// масок, которые изменились, — целиком. Они заменяют прежние с теми же координатами.

const keyOf = ({ cx, cy, cz }: FogChunkBits) => `${cx},${cy},${cz}`;

function mergeChunks(
  base: FogChunkBits[],
  changed: FogChunkBits[],
): FogChunkBits[] {
  if (changed.length === 0) return base;
  const byKey = new Map(base.map((chunk) => [keyOf(chunk), chunk]));
  for (const chunk of changed) byKey.set(keyOf(chunk), chunk);
  return [...byKey.values()];
}

// null — у страницы тумана нет (мастер или туман выключен): разница не нужна.
export function mergeSceneFog(
  fog: GameSceneFogView | null,
  delta: GameSceneFogView | undefined,
): GameSceneFogView | null {
  if (!fog || !delta) return fog;
  return {
    explored: mergeChunks(fog.explored, delta.explored),
    visible: mergeChunks(fog.visible, delta.visible),
  };
}
