import { ModelCompressError } from './compressLimits';

// STL в виде «треугольник за треугольником»: 9 чисел (три вершины) на треугольник,
// без общих вершин — так он и лежит в файле.

const HEADER_BYTES = 84;
const TRIANGLE_BYTES = 50;

function isBinary(bytes: Uint8Array): boolean {
  if (bytes.length < HEADER_BYTES) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return (
    HEADER_BYTES + view.getUint32(80, true) * TRIANGLE_BYTES === bytes.length
  );
}

function readBinary(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  const positions = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    // 12 байт нормали пропускаем: загрузчик всё равно пересчитывает нормали.
    const at = HEADER_BYTES + t * TRIANGLE_BYTES + 12;
    for (let k = 0; k < 9; k++)
      positions[t * 9 + k] = view.getFloat32(at + k * 4, true);
  }
  return positions;
}

// Текстовый STL: берём только строки «vertex x y z», по три на треугольник.
function readAscii(bytes: Uint8Array): Float32Array {
  const text = new TextDecoder().decode(bytes);
  const values: number[] = [];
  const pattern = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text))
    values.push(Number(match[1]), Number(match[2]), Number(match[3]));
  if (
    values.length === 0 ||
    values.length % 9 !== 0 ||
    values.some(Number.isNaN)
  )
    throw new ModelCompressError('Не удалось прочитать STL: файл повреждён');
  return Float32Array.from(values);
}

export function readStl(bytes: Uint8Array): Float32Array {
  return isBinary(bytes) ? readBinary(bytes) : readAscii(bytes);
}

// Двоичный STL из вершин и треугольников (по три индекса). Нормали — нулями:
// загрузчик их пересчитывает (maps/models/loadModel.ts).
export function writeStl(
  positions: Float32Array,
  indices: Uint32Array,
): Uint8Array {
  const count = indices.length / 3;
  const bytes = new Uint8Array(HEADER_BYTES + count * TRIANGLE_BYTES);
  const view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode('compressed in browser'), 0);
  view.setUint32(80, count, true);
  for (let t = 0; t < count; t++) {
    let at = HEADER_BYTES + t * TRIANGLE_BYTES + 12;
    for (let corner = 0; corner < 3; corner++) {
      const v = indices[t * 3 + corner] * 3;
      for (let axis = 0; axis < 3; axis++, at += 4)
        view.setFloat32(at, positions[v + axis], true);
    }
  }
  return bytes;
}

export const stlBytesFor = (triangles: number) =>
  HEADER_BYTES + triangles * TRIANGLE_BYTES;
