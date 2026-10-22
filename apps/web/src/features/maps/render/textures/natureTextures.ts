import { hash, layeredNoise, valueNoise } from './noise';
import { mix, paintTile, scale, type Rgb, type Tile } from './pixels';

// Земля: бурые пятна, тёмные камешки и светлые крупинки.
export function dirtTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = layeredNoise(x, y, 51);
    const speck = hash(x, y, 52);
    const k = speck < 0.08 ? 0.68 : speck > 0.95 ? 1.25 : 0.82 + n * 0.34;
    return scale(base, k);
  });
}

// Трава сверху: пёстрая зелень, отдельные травинки темнее и светлее.
export function grassTopTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = layeredNoise(x, y, 61);
    const blade = hash(x, y, 62);
    const k = blade < 0.12 ? 0.74 : blade > 0.9 ? 1.2 : 0.84 + n * 0.3;
    return scale(base, k);
  });
}

// Бок травы: земля, а сверху свисает дёрн неровной бахромой — 2–5 пикселей.
export function grassSideTile(grass: Rgb, dirt: Rgb): Tile {
  const top = grassTopTile(grass);
  const soil = dirtTile(dirt);
  return paintTile((x, y) => {
    const fringe = 2 + Math.floor(hash(x, 0, 63) * 4);
    const from = y < fringe ? top : soil;
    const i = (y * 16 + x) * 4;
    // Нижний пиксель бахромы темнее: тень дёрна на земле.
    const k = y === fringe - 1 ? 0.8 : 1;
    return scale([from[i], from[i + 1], from[i + 2]], k);
  });
}

// Песок: мелкое светлое зерно с редкими тёмными песчинками.
export function sandTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = valueNoise(x, y, 4, 71) * 0.5 + hash(x, y, 72) * 0.5;
    const grain = hash(x, y, 73);
    return scale(base, grain < 0.06 ? 0.8 : 0.92 + n * 0.14);
  });
}

// Вода: синие пятна и светлые гребешки волн, волна замкнута по ширине плитки.
export function waterTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = valueNoise(x, y, 8, 81);
    const wave = Math.round(Math.sin((x / 16) * Math.PI * 2) * 1.5);
    if ((y + wave + 16) % 6 === 0 && hash(x, y, 82) > 0.25) {
      return mix(base, [255, 255, 255], 0.35);
    }
    return scale(base, 0.86 + n * 0.24);
  });
}
