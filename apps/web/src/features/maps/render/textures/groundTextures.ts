import { contrast, hash, layeredNoise, valueNoise } from './noise';
import { mix, paintTile, scale, type Rgb, type Tile } from './pixels';
import { voronoi } from './voronoi';

const WHITE: Rgb = [255, 255, 255];

// Выжженная земля: обугленная корка, пятна серого пепла и сетка чёрных трещин по
// границам «плиток» спёкшейся земли (у шума трещины складывались в квадрат).
export function scorchedTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    if (voronoi(x, y, 8, 171).edge < 0.7) return scale(base, 0.45);
    const ash = contrast(valueNoise(x, y, 4, 172), 2, 4);
    const color = mix(base, [128, 122, 116], ash * 0.45);
    return scale(color, 0.85 + hash(x, y, 173) * 0.25);
  });
}

// Тропа: утоптанная земля — ровнее обычной, с мелкими светлыми камешками.
export function pathTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    if (hash(x, y, 181) > 0.95) return mix(base, [190, 180, 160], 0.5);
    return scale(base, 0.9 + layeredNoise(x, y, 182) * 0.18);
  });
}

// Бок тропы: земля, а сверху край утоптанного слоя в пиксель — тропа ниже травы
// не делается (у блока нет формы «чуть ниже»), поэтому её видно только по верху.
export function pathSideTile(path: Rgb, dirt: Tile): Tile {
  const top = pathTile(path);
  return paintTile((x, y) => {
    const from = y === 0 ? top : dirt;
    const i = (y * 16 + x) * 4;
    const k = y === 1 ? 0.85 : 1;
    return scale([from[i], from[i + 1], from[i + 2]], k);
  });
}

// Снег: белый с голубоватыми тенями сугробов и редкими искрами.
export function snowTile(base: Rgb): Tile {
  const shadow = mix(base, [130, 160, 205], 0.45);
  return paintTile((x, y) => {
    if (hash(x, y, 191) > 0.97) return WHITE;
    const n = contrast(
      valueNoise(x, y, 8, 192) * 0.7 + valueNoise(x, y, 4, 193) * 0.3,
      2,
      4,
    );
    return mix(shadow, base, 0.25 + n * 0.75);
  });
}

// Листва: пёстрые листья с дырами насквозь (альфа 0) — сквозь крону видно небо и
// ветки соседних блоков. Дыр около пятой части, но не там, где листва гуще.
export function leavesTile(base: Rgb): Tile {
  return paintTile((x, y) => {
    const n = layeredNoise(x, y, 201);
    if (hash(x, y, 202) < 0.22 - n * 0.12) return [0, 0, 0, 0];
    const leaf = hash(x, y, 203);
    const k = leaf < 0.15 ? 0.7 : leaf > 0.88 ? 1.25 : 0.82 + n * 0.3;
    return scale(base, k);
  });
}
