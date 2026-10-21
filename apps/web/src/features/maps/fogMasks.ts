import { useState } from 'react';
import {
  chunkKey,
  type CellMask,
  type FogChunkBits,
  type FogMasks,
  type GameSceneFogView,
} from 'shared';

// Маски тумана войны игрока из ответа сервера (docs/plan/done/fog-of-war.md, этап 5): чанки в
// base64 → биты по чанкам. Неизменившийся чанк остаётся тем же массивом, что и в
// прошлый раз: по ссылке сборка геометрии понимает, что чанк перекрашивать не нужно.

export interface DecodedFog {
  masks: FogMasks;
  // Строка base64, из которой собран каждый массив, — чтобы узнать неизменившийся чанк.
  sources: { explored: Map<string, string>; visible: Map<string, string> };
}

function decodeBits(bits: string): Uint8Array {
  const raw = atob(bits);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function decodeMask(
  chunks: FogChunkBits[],
  prevMask: CellMask | undefined,
  prevSources: Map<string, string> | undefined,
): { mask: CellMask; sources: Map<string, string> } {
  const mask: CellMask = new Map();
  const sources = new Map<string, string>();
  for (const { cx, cy, cz, bits } of chunks) {
    const key = chunkKey(cx, cy, cz);
    const reused = prevSources?.get(key) === bits ? prevMask?.get(key) : null;
    mask.set(key, reused ?? decodeBits(bits));
    sources.set(key, bits);
  }
  return { mask, sources };
}

// null — тумана нет (мастер, туман выключен): сцена рисуется целиком.
export function decodeFog(
  view: GameSceneFogView | null,
  prev: DecodedFog | null,
): DecodedFog | null {
  if (!view) return null;
  const explored = decodeMask(
    view.explored,
    prev?.masks.explored,
    prev?.sources.explored,
  );
  const visible = decodeMask(
    view.visible,
    prev?.masks.visible,
    prev?.sources.visible,
  );
  return {
    masks: { explored: explored.mask, visible: visible.mask },
    sources: { explored: explored.sources, visible: visible.sources },
  };
}

// Маски для сцены из вида сцены: пересобираются, только когда пришёл новый вид тумана,
// и неизменившиеся чанки остаются прежними массивами (decodeFog).
export function useFogMasks(view: GameSceneFogView | null): FogMasks | null {
  const [decoded, setDecoded] = useState(() => ({
    view,
    fog: decodeFog(view, null),
  }));
  if (decoded.view !== view) {
    const next = { view, fog: decodeFog(view, decoded.fog) };
    setDecoded(next);
    return next.fog?.masks ?? null;
  }
  return decoded.fog?.masks ?? null;
}
