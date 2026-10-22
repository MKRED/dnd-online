import { contrast, hash, valueNoise } from './noise';
import { mix, paintTile, scale, type Rgb, type Tile } from './pixels';

const YELLOW: Rgb = [255, 236, 120];
const EMBER_RED: Rgb = [170, 40, 20];

// Шум лавы и огня: крупные потоки, мелкие сгустки и зерно, растянутый ступенями.
const heatAt = (x: number, y: number, seed: number) =>
  contrast(
    valueNoise(x, y, 8, seed) * 0.5 +
      valueNoise(x, y, 4, seed + 1) * 0.35 +
      hash(x, y, seed + 2) * 0.15,
    2.6,
  );

// Лава: тёмная корка, раскалённые потоки и жёлтые сгустки в самых горячих местах.
export function lavaTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const heat = heatAt(x, y, 91);
    if (heat <= 0.25) return scale(base, 0.35 + heat);
    if (heat >= 0.8) return mix(base, YELLOW, 0.75);
    if (heat >= 0.6) return mix(base, YELLOW, 0.35);
    return base;
  });
}

// Кислота: ядовито-зелёная гладь с пузырями — светлый пиксель с тёмной тенью под ним.
export function acidTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = contrast(valueNoise(x, y, 8, 101), 1.8, 4);
    if (hash(x, y, 102) > 0.96) return mix(base, [255, 255, 255], 0.55);
    if (hash(x - 1, y - 1, 102) > 0.96) return scale(base, 0.68);
    return scale(base, 0.82 + n * 0.3);
  });
}

// Ядовитая топь: мутная тёмная жижа, пятна ряски и светлые пузыри.
export function swampTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = contrast(
      valueNoise(x, y, 4, 111) * 0.7 + hash(x, y, 114) * 0.3,
      2,
    );
    const algae = valueNoise(x, y, 8, 112) > 0.6;
    if (hash(x, y, 113) > 0.95) return mix(base, [220, 230, 160], 0.55);
    if (hash(x - 1, y - 1, 113) > 0.95) return scale(base, 0.6);
    const tint = algae ? mix(base, [120, 150, 40], 0.4) : base;
    return scale(tint, 0.72 + n * 0.45);
  });
}

// Огонь на полу: угли — тёмная зола, красный жар, языки цвета материала и жёлтые искры.
export function fireTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const heat = heatAt(x, y, 121);
    if (heat <= 0.2) return scale(EMBER_RED, 0.45);
    if (heat <= 0.45) return EMBER_RED;
    if (heat >= 0.85) return YELLOW;
    return heat >= 0.65 ? base : mix(EMBER_RED, base, 0.5);
  });
}
