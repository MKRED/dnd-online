import { Box3, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { CharacterModelFormat } from 'shared';
import { apiRequestBlob } from '../../../lib/apiRequest';
import type { ModelBox } from './modelFit';

export interface LoadedModel {
  format: CharacterModelFormat;
  object: Object3D;
  box: ModelBox;
}

// Модель разбирается один раз на адрес (в нём версия модели): фигурка на сцене и
// предпросмотр в форме берут её копии (ModelFigure).
const cache = new Map<string, Promise<LoadedModel>>();

async function parse(
  data: ArrayBuffer,
  format: CharacterModelFormat,
): Promise<Object3D> {
  if (format === 'glb') {
    const gltf = await new GLTFLoader().parseAsync(data, '');
    return gltf.scene;
  }
  // У STL нет цвета: материал задаёт ModelFigure по цвету фигурки.
  // Нормали из файла не берём: экспортёры для печати часто пишут нули, и модель
  // выходит чёрной. Геометрия STL без общих вершин — пересчёт даёт плоские грани.
  const geometry = new STLLoader().parse(data);
  geometry.deleteAttribute('normal');
  geometry.computeVertexNormals();
  return new Mesh(geometry, new MeshStandardMaterial());
}

export function loadModel(
  path: string,
  format: CharacterModelFormat,
): Promise<LoadedModel> {
  let pending = cache.get(path);
  if (!pending) {
    pending = apiRequestBlob(path)
      .then((blob) => blob.arrayBuffer())
      .then((data) => parse(data, format))
      .then((object) => {
        const { min, max } = new Box3().setFromObject(object);
        return {
          format,
          object,
          box: { min: min.toArray(), max: max.toArray() },
        };
      });
    // Неудача не остаётся в кэше: следующая попытка загрузит заново.
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending;
}
