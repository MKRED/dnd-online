import type { Vec3 } from 'shared';
import { atlasUv } from './textures/atlas';
import type { FaceKind } from './textures/materialTextures';

// Какая плитка у грани: верх, низ или бок.
export function faceKind(axis: number, side: 1 | -1): FaceKind {
  if (axis !== 1) return 'side';
  return side > 0 ? 'top' : 'bottom';
}

// Место точки грани на плитке: s слева направо, t сверху вниз по картинке. Считается
// по положению точки в клетке, а не по номеру угла, — поэтому порядок углов (обход
// против часовой у faceCorners) на текстуру не влияет. Плитка привязана к клетке:
// плита берёт нижнюю половину картинки, тонкая стена — полоску, масштаб у всех
// форм один. У боковых граней t всегда идёт по высоте, чтобы бахрома травы была
// сверху; s — слева направо, если смотреть на грань снаружи.
function tileCoords(local: Vec3, axis: number, side: 1 | -1): [number, number] {
  const [x, y, z] = local;
  if (axis === 1) return [x, side > 0 ? z : 1 - z];
  if (axis === 0) return [side > 0 ? 1 - z : z, 1 - y];
  return [side > 0 ? x : 1 - x, 1 - y];
}

// UV углов грани в атласе. Повороты блока плитку не крутят: у шумных базовых текстур
// этого не видно; понадобится с текстурами, у которых есть направление.
export function faceUvs(
  cell: Vec3,
  corners: Vec3[],
  axis: number,
  side: 1 | -1,
  tileSet: number,
): number[] {
  const face = faceKind(axis, side);
  return corners.flatMap((corner) => {
    const local: Vec3 = [
      corner[0] - cell[0],
      corner[1] - cell[1],
      corner[2] - cell[2],
    ];
    const [s, t] = tileCoords(local, axis, side);
    return atlasUv(tileSet, face, s, t);
  });
}
