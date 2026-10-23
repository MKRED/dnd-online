import { Mesh, type BufferGeometry, type Object3D } from 'three';

// Треугольники загруженной модели в её собственных координатах, по 9 чисел на
// треугольник: из них shared считает воксели для правил (docs/plan/blocks.md, этап 9).
// Узлы `.glb` могут быть сдвинуты и повёрнуты — берём мировые координаты вершин.
export function meshTriangles(object: Object3D): Float32Array {
  object.updateMatrixWorld(true);
  const parts: Float32Array[] = [];
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const geometry = node.geometry as BufferGeometry;
    const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    flat.applyMatrix4(node.matrixWorld);
    const position = flat.getAttribute('position');
    parts.push(Float32Array.from(position.array as ArrayLike<number>));
    flat.dispose();
  });
  const out = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
