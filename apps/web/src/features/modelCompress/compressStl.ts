import { MeshoptSimplifier } from 'meshoptimizer';
import {
  COMPRESS_LIMIT_BYTES,
  COMPRESS_MAX_PASSES,
  COMPRESS_TARGET_BYTES,
  ModelCompressError,
  type CompressProgress,
  type CompressResult,
} from './compressLimits';
import { readStl, stlBytesFor, writeStl } from './stlMesh';

// Склейка одинаковых вершин в общий буфер. Упрощению нужен именно сжатый буфер: с
// индексами из generatePositionRemap по исходному (каждая вершина повторена в каждом
// треугольнике) meshoptimizer ничего не схлопывал — проверено на сфере 2026-10-23.
function weldStl(positions: Float32Array) {
  const remap = MeshoptSimplifier.generatePositionRemap(positions, 3);
  const count = positions.length / 3;
  const slot = new Uint32Array(count);
  let unique = 0;
  for (let i = 0; i < count; i++) if (remap[i] === i) slot[i] = unique++;
  const vertices = new Float32Array(unique * 3);
  for (let i = 0; i < count; i++)
    if (remap[i] === i)
      vertices.set(positions.subarray(i * 3, i * 3 + 3), slot[i] * 3);
  const indices = new Uint32Array(count);
  for (let i = 0; i < count; i++) indices[i] = slot[remap[i]];
  return { vertices, indices };
}

// STL остаётся STL (у него цвет фигурки выбирается в форме), а вес STL — ровно 50 байт
// на треугольник, так что бюджет — это сразу число треугольников. Склейка вершин
// (generatePositionRemap) нужна упрощению: без общих вершин каждый треугольник —
// отдельный остров, и упрощать нечего.
export async function compressStl(
  bytes: Uint8Array,
  onProgress: (progress: CompressProgress) => void,
): Promise<CompressResult> {
  onProgress({ stage: 'read' });
  const positions = readStl(bytes);
  const triangles = positions.length / 9;
  await MeshoptSimplifier.ready;
  const { vertices, indices } = weldStl(positions);

  let target = Math.floor((COMPRESS_TARGET_BYTES - stlBytesFor(0)) / 50);
  // Ошибка — доля размера модели: сначала бережно, на каждом проходе смелее.
  let error = 0.01;
  for (let pass = 1; pass <= COMPRESS_MAX_PASSES; pass++) {
    onProgress({ stage: 'simplify', pass, passes: COMPRESS_MAX_PASSES });
    const [simplified] = MeshoptSimplifier.simplify(
      indices,
      vertices,
      3,
      Math.min(target, triangles) * 3,
      error,
    );
    const data = writeStl(vertices, simplified);
    if (data.length <= COMPRESS_LIMIT_BYTES)
      return {
        data,
        before: { bytes: bytes.length, triangles },
        after: { bytes: data.length, triangles: simplified.length / 3 },
      };
    // Упрощение остановилось раньше цели — разрешаем больше ошибки.
    error *= 4;
    target = Math.floor(target * 0.9);
  }
  throw new ModelCompressError(
    'Не удалось сжать модель до 9 МБ. Упростите её в Blender и загрузите снова.',
  );
}
