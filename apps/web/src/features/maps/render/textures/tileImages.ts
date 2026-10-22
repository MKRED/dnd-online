import { MATERIALS, type MaterialName } from 'shared';
import { tileFromBase64 } from './customTiles';
import { pngDataUrl } from './encodePng';
import { materialTextures, type FaceKind } from './materialTextures';
import { TILE_SIZE } from './pixels';

const cache = new Map<string, string>();

// Плитка как картинка (data URL) — для значков блоков вне сцены. Кэш на страницу:
// в окне выбора десятки значков одного материала. color — основной цвет своей группы
// блоков, перекрашивающий узор основы.
export function tileImage(
  material: MaterialName,
  face: FaceKind,
  color: string = MATERIALS[material].color,
): string {
  const key = `${material}:${face}:${color}`;
  let url = cache.get(key);
  if (!url) {
    url = pngDataUrl(
      materialTextures(material, color)[face],
      TILE_SIZE,
      TILE_SIZE,
    );
    cache.set(key, url);
  }
  return url;
}

const ownCache = new Map<string, string>();

// Своя плитка группы (base64 пикселей, shared BlockTextures) как картинка.
export function ownTileImage(data: string): string {
  let url = ownCache.get(data);
  if (!url) {
    url = pngDataUrl(tileFromBase64(data), TILE_SIZE, TILE_SIZE);
    ownCache.set(data, url);
  }
  return url;
}
