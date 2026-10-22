import {
  cellFromChunk,
  cellRotation,
  parseChunkKey,
  readCell,
  shapeBoxes,
  type ChunkStore,
  type MapSize,
  type ShapeBox,
  type Vec3,
} from 'shared';
import type { BlockAppearance, BlockLookup } from './blockLookup';
import { BufferBuilder, type MeshBuffers } from './bufferBuilder';
import { faceUvs } from './faceUv';
import { CUTOUT_MATERIALS } from './textures/materialTextures';

export type { MeshBuffers };

// Прозрачные блоки (стекло, лёд) — отдельная геометрия: им нужен свой материал.
export interface ChunkMeshes {
  opaque: MeshBuffers | null;
  transparent: MeshBuffers | null;
}

export interface MeshOptions {
  // Срез по высоте: клетки выше cutY считаются воздухом. Именно пересборка, а не
  // плоскость отсечения — так у срезанных стен появляются верхние грани.
  cutY?: number;
  // Размер карты: блоки за восточной и южной границей (скрытые сужением карты) не
  // рисуются и не закрывают грани соседей — у края карты видна стена, а не дыра.
  size?: MapSize;
  // Туман войны игрока: биты «видно сейчас» этого чанка (индекс — как у клетки в чанке).
  // Блок вне них группа видела раньше — он серый (fogDim, сереет в шейдере). undefined — тумана нет;
  // null — туман есть, а в чанке сейчас не видно ничего.
  seen?: Uint8Array | null;
}

// Грань коробки на границе клетки скрыта, только если соседняя клетка закрывает её
// целиком: сосед — полный куб, непрозрачный или того же прозрачного типа (стекло к стеклу).
// Плита рядом с кубом не скрывает его боковую грань, куб рядом со стеклом — тоже.
// Листва листву не скрывает: сквозь дыры видны листья в глубине кроны.
function neighbourHidesFace(
  self: BlockAppearance,
  neighbour: BlockAppearance | null,
): boolean {
  if (!neighbour || neighbour.shape !== 'cube') return false;
  if (CUTOUT_MATERIALS.has(neighbour.materialName)) return false;
  return neighbour.material.opaque || neighbour.typeId === self.typeId;
}

// Четыре угла грани против часовой стрелки при взгляде снаружи (со стороны нормали):
// для оси a оси u = a+1, v = a+2 образуют правую тройку, и обход u→v даёт нормаль +a.
function faceCorners(
  origin: Vec3,
  box: ShapeBox,
  axis: number,
  side: 1 | -1,
): Vec3[] {
  const u = (axis + 1) % 3;
  const v = (axis + 2) % 3;
  const plane = side > 0 ? box[axis + 3] : box[axis];
  const corner = (uValue: number, vValue: number): Vec3 => {
    const point = [0, 0, 0];
    point[axis] = origin[axis] + plane;
    point[u] = origin[u] + uValue;
    point[v] = origin[v] + vValue;
    return [point[0], point[1], point[2]];
  };
  const [u0, u1, v0, v1] = [box[u], box[u + 3], box[v], box[v + 3]];
  const ccw = [corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)];
  return side > 0 ? ccw : ccw.reverse();
}

// Геометрия одного чанка в мировых координатах. Соседей читает через всё хранилище,
// иначе грани на границах чанков рисовались бы всегда (или не рисовались никогда).
export function buildChunkMesh(
  store: ChunkStore,
  key: string,
  lookup: BlockLookup,
  { cutY, size, seen }: MeshOptions = {},
): ChunkMeshes {
  const chunk = store.get(key);
  const opaque = new BufferBuilder();
  const transparent = new BufferBuilder();
  if (!chunk) return { opaque: null, transparent: null };

  const isHidden = ([x, y, z]: Vec3) =>
    (cutY !== undefined && y > cutY) ||
    (size !== undefined && (x >= size.width || z >= size.depth));
  const blockAt = (cell: Vec3) =>
    isHidden(cell) ? null : lookup(readCell(store, cell));
  const chunkCoord = parseChunkKey(key);

  for (let index = 0; index < chunk.length; index++) {
    const value = chunk[index];
    const self = lookup(value);
    if (!self) continue;
    const cell = cellFromChunk(chunkCoord, index);
    if (isHidden(cell)) continue;
    const solid =
      self.material.opaque || CUTOUT_MATERIALS.has(self.materialName);
    const target = solid ? opaque : transparent;
    const dim =
      seen !== undefined &&
      (seen === null || (seen[index >> 3] & (1 << (index & 7))) === 0);
    const fogDim = dim ? 1 : 0;

    for (const box of shapeBoxes(self.shape, cellRotation(value))) {
      for (let axis = 0; axis < 3; axis++) {
        for (const side of [1, -1] as const) {
          const onBoundary = side > 0 ? box[axis + 3] === 1 : box[axis] === 0;
          if (onBoundary) {
            const neighbourCell: [number, number, number] = [...cell];
            neighbourCell[axis] += side;
            if (neighbourHidesFace(self, blockAt(neighbourCell))) continue;
          }
          const normal: [number, number, number] = [0, 0, 0];
          normal[axis] = side;
          const corners = faceCorners(cell, box, axis, side);
          const uvs = faceUvs(cell, corners, axis, side, self.materialName);
          target.addQuad(corners, normal, fogDim, uvs);
        }
      }
    }
  }
  return { opaque: opaque.build(), transparent: transparent.build() };
}
