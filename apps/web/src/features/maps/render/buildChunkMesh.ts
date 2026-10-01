import {
  cellFromChunk,
  cellRotation,
  parseChunkKey,
  readCell,
  shapeBoxes,
  type ChunkStore,
  type ShapeBox,
  type Vec3,
} from 'shared';
import type { BlockAppearance, BlockLookup } from './blockLookup';

// Буферы одной геометрии: позиции, нормали и цвета по вершинам, индексы треугольников.
export interface MeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

// Прозрачные блоки (стекло, лёд) — отдельная геометрия: им нужен свой материал.
export interface ChunkMeshes {
  opaque: MeshBuffers | null;
  transparent: MeshBuffers | null;
}

export interface MeshOptions {
  // Срез по высоте: клетки выше cutY считаются воздухом. Именно пересборка, а не
  // плоскость отсечения — так у срезанных стен появляются верхние грани.
  cutY?: number;
}

class BufferBuilder {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];

  addQuad(corners: Vec3[], normal: Vec3, color: [number, number, number]) {
    const base = this.positions.length / 3;
    for (const corner of corners) {
      this.positions.push(...corner);
      this.normals.push(...normal);
      this.colors.push(...color);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): MeshBuffers | null {
    if (this.indices.length === 0) return null;
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      indices: new Uint32Array(this.indices),
    };
  }
}

// Грань коробки на границе клетки скрыта, только если соседняя клетка закрывает её
// целиком: сосед — полный куб, непрозрачный или того же прозрачного типа (стекло к стеклу).
// Плита рядом с кубом не скрывает его боковую грань, куб рядом со стеклом — тоже.
function neighbourHidesFace(
  self: BlockAppearance,
  neighbour: BlockAppearance | null,
): boolean {
  if (!neighbour || neighbour.shape !== 'cube') return false;
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
  { cutY }: MeshOptions = {},
): ChunkMeshes {
  const chunk = store.get(key);
  const opaque = new BufferBuilder();
  const transparent = new BufferBuilder();
  if (!chunk) return { opaque: null, transparent: null };

  const isCut = (y: number) => cutY !== undefined && y > cutY;
  const blockAt = (cell: Vec3) =>
    isCut(cell[1]) ? null : lookup(readCell(store, cell));
  const chunkCoord = parseChunkKey(key);

  for (let index = 0; index < chunk.length; index++) {
    const value = chunk[index];
    const self = lookup(value);
    if (!self) continue;
    const cell = cellFromChunk(chunkCoord, index);
    if (isCut(cell[1])) continue;
    const target = self.material.opaque ? opaque : transparent;

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
          target.addQuad(
            faceCorners(cell, box, axis, side),
            normal,
            self.color,
          );
        }
      }
    }
  }
  return { opaque: opaque.build(), transparent: transparent.build() };
}
