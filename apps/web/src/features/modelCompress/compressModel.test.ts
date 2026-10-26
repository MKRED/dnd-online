import { Document, NodeIO, WebIO } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { CHARACTER_MODEL_MAX_BYTES, detectModelFormat } from 'shared';
import { COMPRESS_LIMIT_BYTES, ModelCompressError } from './compressLimits';
import { compressModel } from './compressModel';
import { readStl, writeStl } from './stlMesh';

// Бугристая сфера из сетки широта × долгота: вершины общие, 2 треугольника на ячейку.
// Бугры — чтобы упрощению было что беречь, а не схлопнуть всё в пару граней.
function sphere(rows: number, cols: number) {
  const positions = new Float32Array((rows + 1) * (cols + 1) * 3);
  for (let i = 0; i <= rows; i++)
    for (let j = 0; j <= cols; j++) {
      const v = (i / rows) * Math.PI;
      const u = (j / cols) * Math.PI * 2;
      const r = 1 + 0.05 * Math.sin(u * 12) * Math.sin(v * 9);
      const at = (i * (cols + 1) + j) * 3;
      positions[at] = Math.sin(v) * Math.cos(u) * r;
      positions[at + 1] = Math.cos(v) * r;
      positions[at + 2] = Math.sin(v) * Math.sin(u) * r;
    }
  const indices = new Uint32Array(rows * cols * 6);
  let k = 0;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;
      indices.set([a, b, a + 1, a + 1, b, b + 1], k);
      k += 6;
    }
  return { positions, indices };
}

async function heavyGlb(rows: number, cols: number): Promise<Uint8Array> {
  const { positions, indices } = sphere(rows, cols);
  const document = new Document();
  const buffer = document.createBuffer();
  const primitive = document
    .createPrimitive()
    .setAttribute(
      'POSITION',
      document
        .createAccessor()
        .setType('VEC3')
        .setArray(positions)
        .setBuffer(buffer),
    )
    .setIndices(document.createAccessor().setArray(indices).setBuffer(buffer));
  const mesh = document.createMesh('figure').addPrimitive(primitive);
  document.createScene().addChild(document.createNode('figure').setMesh(mesh));
  return new NodeIO().writeBinary(document);
}

describe('compressModel', () => {
  it('тяжёлый STL сжимается в STL не больше 9 МБ с меньшим числом треугольников', async () => {
    const { positions, indices } = sphere(400, 400);
    const stl = writeStl(positions, indices);
    expect(stl.length).toBeGreaterThan(CHARACTER_MODEL_MAX_BYTES);
    const stages: string[] = [];

    const result = await compressModel(stl, (p) => stages.push(p.stage));

    expect(detectModelFormat(result.data)).toBe('stl');
    expect(result.data.length).toBeLessThanOrEqual(COMPRESS_LIMIT_BYTES);
    expect(result.before).toEqual({ bytes: stl.length, triangles: 320000 });
    expect(result.after.triangles).toBeLessThan(320000);
    expect(result.after.triangles).toBeGreaterThan(100000);
    expect(readStl(result.data).length / 9).toBe(result.after.triangles);
    expect(stages).toContain('simplify');
  });

  it('тяжёлый .glb сжимается в читаемый .glb не больше 9 МБ', async () => {
    const glb = await heavyGlb(500, 700);
    expect(glb.length).toBeGreaterThan(CHARACTER_MODEL_MAX_BYTES);

    const result = await compressModel(glb);

    expect(detectModelFormat(result.data)).toBe('glb');
    expect(result.data.length).toBeLessThanOrEqual(COMPRESS_LIMIT_BYTES);
    expect(result.before.triangles).toBe(700000);
    expect(result.after.triangles).toBeLessThan(700000);
    const reread = await new WebIO().readBinary(result.data);
    expect(reread.getRoot().listMeshes()).toHaveLength(1);
  });

  it('текстовый STL читается по строкам vertex', () => {
    const text = [
      'solid test',
      'facet normal 0 0 1',
      'outer loop',
      'vertex 0 0 0',
      'vertex 1 0 0',
      'vertex 0 1.5 0',
      'endloop',
      'endfacet',
      'endsolid test',
    ].join('\n');
    expect(Array.from(readStl(new TextEncoder().encode(text)))).toEqual([
      0, 0, 0, 1, 0, 0, 0, 1.5, 0,
    ]);
  });

  it('не модель — понятная ошибка', async () => {
    await expect(
      compressModel(new TextEncoder().encode('just text, not a model')),
    ).rejects.toBeInstanceOf(ModelCompressError);
  });
});
