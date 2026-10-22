import type { MaterialName } from 'shared';
import { pngDataUrl } from './encodePng';
import { materialTextures, type FaceKind } from './materialTextures';
import { TILE_SIZE } from './pixels';

const cache = new Map<string, string>();

// Плитка как картинка (data URL) — для значков блоков вне сцены. Кэш на страницу:
// в окне выбора десятки значков одного материала.
export function tileImage(material: MaterialName, face: FaceKind): string {
  const key = `${material}:${face}`;
  let url = cache.get(key);
  if (!url) {
    url = pngDataUrl(materialTextures(material)[face], TILE_SIZE, TILE_SIZE);
    cache.set(key, url);
  }
  return url;
}
