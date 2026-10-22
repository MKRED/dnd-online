import type { Vec3 } from 'shared';

// Буферы одной геометрии: позиции, нормали, места в атласе текстур и признак серой
// зоны тумана (1 — серый, 0 — нет) по вершинам, индексы треугольников.
export interface MeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  fogDims: Float32Array;
  indices: Uint32Array;
}

export class BufferBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  fogDims: number[] = [];
  indices: number[] = [];

  addQuad(corners: Vec3[], normal: Vec3, fogDim: 0 | 1, uvs: number[]) {
    const base = this.positions.length / 3;
    for (const corner of corners) {
      this.positions.push(...corner);
      this.normals.push(...normal);
      this.fogDims.push(fogDim);
    }
    this.uvs.push(...uvs);
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): MeshBuffers | null {
    if (this.indices.length === 0) return null;
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      fogDims: new Float32Array(this.fogDims),
      indices: new Uint32Array(this.indices),
    };
  }
}
