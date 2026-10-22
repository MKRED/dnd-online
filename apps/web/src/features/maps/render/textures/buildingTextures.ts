import { hash, layeredNoise, valueNoise } from './noise';
import { mix, paintTile, scale, type Rgb, type Tile } from './pixels';

const WHITE: Rgb = [255, 255, 255];

// Камень: серые пятна с тёмными крапинками и редкими светлыми.
export function stoneTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = layeredNoise(x, y, 11);
    const speck = hash(x, y, 12);
    const k = speck < 0.07 ? 0.7 : speck > 0.96 ? 1.18 : 0.84 + n * 0.32;
    return scale(base, k);
  });
}

// Кирпич: ряды по 4 пикселя, кирпич 8 × 3 со швом в пиксель, через ряд со сдвигом
// на полкирпича. Каждый кирпич чуть своего оттенка.
export function brickTile(base: Rgb): Tile {
  const mortar = mix(scale(base, 0.6), [190, 182, 170], 0.55);
  return paintTile((x, y) => {
    const row = Math.floor(y / 4);
    const shifted = (x + (row % 2) * 4) % 16;
    if (y % 4 === 3 || shifted % 8 === 7) {
      return scale(mortar, 0.92 + hash(x, y, 21) * 0.16);
    }
    const brick = Math.floor(shifted / 8);
    const tone = 0.86 + hash(brick, row, 22) * 0.22;
    // Верхний край кирпича светлее — как будто свет сверху.
    const lit = y % 4 === 0 ? 1.08 : 1;
    return scale(base, tone * lit * (0.94 + hash(x, y, 23) * 0.12));
  });
}

// Дощатый настил: доски по 4 пикселя с тёмным швом, волокна вдоль доски, торцевой
// стык у каждой доски на своём месте.
export function planksTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const plank = Math.floor(y / 4);
    const joint = Math.floor(hash(plank, 0, 31) * 16);
    if (y % 4 === 3 || x === joint) return scale(base, 0.62);
    const grain = valueNoise(x, y, 8, 32 + plank, 1);
    const tone = 0.9 + hash(plank, 1, 33) * 0.16;
    return scale(base, tone * (0.86 + grain * 0.24));
  });
}

// Стекло: светлая рамка по краю и почти прозрачная середина с бликами по диагонали.
export function glassTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) return [...mix(base, WHITE, 0.45), 230];
    const d = x - y;
    if ((d === 4 || d === 5) && x < 11) return [...mix(base, WHITE, 0.7), 150];
    if (d === -6 && x > 4) return [...mix(base, WHITE, 0.6), 120];
    return [...base, 45];
  });
}

// Лёд: голубой с белыми трещинами и полупрозрачный.
export function iceTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = layeredNoise(x, y, 41);
    const crack = Math.abs(valueNoise(x, y, 8, 42) - 0.5) < 0.04;
    const color = crack ? mix(base, WHITE, 0.75) : scale(base, 0.9 + n * 0.18);
    return [...color, crack ? 220 : 170];
  });
}
