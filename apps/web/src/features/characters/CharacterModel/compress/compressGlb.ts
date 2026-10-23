import { WebIO, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  prune,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import {
  COMPRESS_LIMIT_BYTES,
  COMPRESS_MAX_PASSES,
  COMPRESS_TARGET_BYTES,
  ModelCompressError,
  type CompressProgress,
  type CompressResult,
} from './compressLimits';

// Сторона текстуры: сначала 2048, если файл всё ещё велик — меньше. Фигурка на карте
// мелкая, больше 2048 там не разглядеть.
const TEXTURE_SIDES = [2048, 1024, 512];

function countTriangles(document: Document): number {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes())
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const position = primitive.getAttribute('POSITION');
      total += (indices?.getCount() ?? position?.getCount() ?? 0) / 3;
    }
  return Math.round(total);
}

const textureBytes = (document: Document) =>
  document
    .getRoot()
    .listTextures()
    .reduce((sum, texture) => sum + (texture.getImage()?.length ?? 0), 0);

// .glb остаётся .glb, без расширений сжатия геометрии (Draco, meshopt): их загрузчик
// карты не знает. Вес уходит на геометрию и текстуры: текстуры ужимаем по сторонам и
// в WebP, геометрию упрощаем под оставшийся бюджет и проверяем размер записью.
export async function compressGlb(
  bytes: Uint8Array,
  onProgress: (progress: CompressProgress) => void,
): Promise<CompressResult> {
  onProgress({ stage: 'read' });
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS);
  let document: Document;
  try {
    document = await io.readBinary(bytes);
  } catch (err) {
    console.error('Failed to read .glb for compression', err);
    throw new ModelCompressError(
      'Не удалось прочитать .glb. Если в нём сжатая геометрия (Draco), сохраните модель без неё.',
    );
  }
  const triangles = countTriangles(document);
  await MeshoptSimplifier.ready;
  await document.transform(dedup(), prune(), weld());

  let side = 0;
  if (document.getRoot().listTextures().length > 0) {
    onProgress({ stage: 'textures' });
    await document.transform(
      textureCompress({
        targetFormat: 'webp',
        resize: [TEXTURE_SIDES[0], TEXTURE_SIDES[0]],
      }),
    );
  }

  let data = await io.writeBinary(document);
  for (let pass = 1; data.length > COMPRESS_TARGET_BYTES; pass++) {
    if (pass > COMPRESS_MAX_PASSES) break;
    onProgress({ stage: 'simplify', pass, passes: COMPRESS_MAX_PASSES });
    const textures = textureBytes(document);
    // Текстуры съели больше половины бюджета — сначала ужимаем их дальше.
    if (
      textures > COMPRESS_TARGET_BYTES / 2 &&
      side < TEXTURE_SIDES.length - 1
    ) {
      side++;
      await document.transform(
        textureCompress({ resize: [TEXTURE_SIDES[side], TEXTURE_SIDES[side]] }),
      );
    } else {
      // Геометрия весит примерно пропорционально числу треугольников.
      const geometry = Math.max(1, data.length - textures);
      const room = Math.max(0, COMPRESS_TARGET_BYTES - textures);
      const ratio = Math.min(0.95, (room / geometry) * 0.9);
      await document.transform(
        simplify({
          simplifier: MeshoptSimplifier,
          ratio,
          // Цель — вес, а не точность: допустимая ошибка растёт с каждым проходом.
          error: 0.01 * 4 ** (pass - 1),
        }),
        prune(),
      );
    }
    data = await io.writeBinary(document);
  }
  if (data.length > COMPRESS_LIMIT_BYTES)
    throw new ModelCompressError(
      'Не удалось сжать модель до 9 МБ. Упростите её в Blender и загрузите снова.',
    );
  return {
    data,
    before: { bytes: bytes.length, triangles },
    after: { bytes: data.length, triangles: countTriangles(document) },
  };
}
