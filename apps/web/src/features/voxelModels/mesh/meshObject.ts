import { Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  meshPlacement,
  orientMeshPoint,
  STL_DEFAULT_COLOR,
  type ModelMeshFit,
  type Vec3,
} from 'shared';
import type { LoadedModel } from '../../maps/models';

// Своя копия файла на каждое место: один объект three не может стоять в двух. STL
// получает свой материал цвета модели — его освобождает тот, кто взял копию.
export function meshObjectCopy(
  model: LoadedModel,
  color: string | null,
): Object3D {
  const copy = clone(model.object);
  if (model.format === 'stl') {
    const material = new MeshStandardMaterial({
      color: color ?? STL_DEFAULT_COLOR,
      roughness: 0.8,
    });
    copy.traverse((node) => {
      if (node instanceof Mesh) node.material = material;
    });
  }
  return copy;
}

// Материалы, созданные meshObjectCopy для STL; у `.glb` материалы общие с кэшем.
export function disposeMeshObjectCopy(model: LoadedModel, object: Object3D) {
  if (model.format !== 'stl') return;
  object.traverse((node) => {
    if (node instanceof Mesh) (node.material as MeshStandardMaterial).dispose();
  });
}

// Масштаб и сдвиг файла в вокселях — как у вокселей для правил (fitMeshTriangles в
// shared); null — у файла нет объёма.
export function meshFitPlacement(
  { min, max }: LoadedModel['box'],
  fit: ModelMeshFit,
  size: Vec3,
) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  // Повороты кратны четверти оборота: коробка углов после поворота — коробка модели.
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        const p = orientMeshPoint(x, y, z, fit);
        for (let a = 0; a < 3; a++) {
          lo[a] = Math.min(lo[a], p[a]);
          hi[a] = Math.max(hi[a], p[a]);
        }
      }
  return meshPlacement(lo, hi, size);
}

// Та же сборка, что у MeshModel, без React: для снимка модели вне холста. Начало — угол
// клеток модели, единица — воксель.
export function fittedMeshGroup(
  object: Object3D,
  placement: NonNullable<ReturnType<typeof meshFitPlacement>>,
  fit: ModelMeshFit,
): Group {
  const outer = new Group();
  outer.position.set(...placement.shift);
  outer.scale.setScalar(placement.scale);
  const turn = new Group();
  turn.rotation.y = (-fit.turn * Math.PI) / 2;
  const up = new Group();
  up.rotation.x = fit.up === 'z' ? -Math.PI / 2 : 0;
  up.add(object);
  turn.add(up);
  outer.add(turn);
  return outer;
}
