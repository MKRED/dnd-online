import { hash, layeredNoise, valueNoise } from './noise';
import { mix, paintTile, scale, type Rgb, type Tile } from './pixels';
import { voronoi } from './voronoi';

const MOSS: Rgb = [92, 128, 52];

// Камень мостовой: тон камня, светлый верхний край и тёмный шов между камнями.
function cobbleAt(base: Rgb, x: number, y: number, seed: number): Rgb | null {
  const stone = voronoi(x, y, 4, seed);
  if (stone.edge < 1) return null;
  const tone = 0.8 + hash(stone.id, 0, seed + 2) * 0.32;
  // Низ камня, у самого шва, в тени.
  const lit = voronoi(x, y + 1, 4, seed).edge < 1 ? 0.84 : 1;
  return scale(base, tone * lit * (0.94 + hash(x, y, seed + 3) * 0.12));
}

// Булыжник: округлые камни разных оттенков с тёмными швами.
export function cobbleTile(base: Rgb): Tile {
  return paintTile((x, y) => cobbleAt(base, x, y, 131) ?? scale(base, 0.5));
}

// Тёмный камень: почти чёрный базальт с редкими светлыми прожилками.
export function darkstoneTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const vein = Math.abs(valueNoise(x, y, 8, 141) - 0.5) < 0.035;
    if (vein) return mix(base, [150, 140, 170], 0.45);
    const n = layeredNoise(x, y, 142);
    return scale(base, hash(x, y, 143) < 0.06 ? 0.7 : 0.86 + n * 0.28);
  });
}

// Мшистый камень: та же мостовая, но швы и пятна по камням заросли мхом.
export function mossyTile(base: Rgb): Tile {
  const moss = mix(MOSS, base, 0.25);
  return paintTile((x, y) => {
    const overgrown = valueNoise(x, y, 8, 152) > 0.55;
    const stone = cobbleAt(base, x, y, 151);
    if (!stone) return scale(moss, 0.65 + hash(x, y, 153) * 0.25);
    if (overgrown && hash(x, y, 154) > 0.3) {
      return scale(moss, 0.85 + hash(x, y, 155) * 0.3);
    }
    return stone;
  });
}

// Обломки: битый камень крупнее и пестрее мостовой, с тёмными щелями между кусками.
export function rubbleTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const chunk = voronoi(x, y, 4, 161);
    if (chunk.edge < 1.1 || hash(chunk.id, 1, 162) < 0.12) {
      return scale(base, 0.42);
    }
    const tone = 0.72 + hash(chunk.id, 0, 163) * 0.5;
    // Кусок освещён сверху: пиксели в верхней части камня светлее.
    const lit = voronoi(x, y - 1, 4, 161).id === chunk.id ? 1 : 1.12;
    return scale(base, tone * lit * (0.9 + hash(x, y, 164) * 0.16));
  });
}
