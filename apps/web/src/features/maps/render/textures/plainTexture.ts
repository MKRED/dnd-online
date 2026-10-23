import { hash } from './noise';
import { paintTile, scale, type Rgb, type Tile } from './pixels';

// Однотонная основа своих групп (docs/plan/blocks.md, «Однотонная основа»): ровный цвет
// с едва заметной зернистостью — совсем гладкая грань в пиксельном мире выглядит
// пластиком, а сильный шум мешал бы рисовать поверх неё свою текстуру.
export function plainTile(base: Rgb): Tile {
  return paintTile((x, y) => scale(base, 0.97 + hash(x, y, 91) * 0.06));
}
