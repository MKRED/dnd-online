import { useEffect, useMemo } from 'react';
import { Mesh, MeshStandardMaterial } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STL_DEFAULT_COLOR, type CharacterModelFit } from 'shared';
import type { LoadedModel } from './loadModel';
import {
  lyingShrink,
  lyingThickness,
  placedHeight,
  placeModel,
} from './modelFit';

interface ModelFigureProps {
  model: LoadedModel;
  // Сторона места существа в клетках.
  footprint: number;
  fit: CharacterModelFit;
  // Цвет фигурки из STL; у .glb свои цвета.
  color: string | null;
  // Без сознания: модель ложится на спину в своё место, как карточка.
  lying?: boolean;
}

// Модель, вписанная в место существа: центр основания — в начале координат группы,
// нижняя грань — на полу (docs/plan/character-models.md). Поворот по взгляду и позу
// задаёт тот, кто ставит группу.
function ModelFigure({
  model,
  footprint,
  fit,
  color,
  lying = false,
}: ModelFigureProps) {
  // Своя копия на каждую фигурку: один объект three не может стоять в двух местах.
  // SkeletonUtils.clone копирует и скелет, если он есть в .glb.
  const object = useMemo(() => {
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
  }, [model, color]);

  // Материал STL создан здесь — и освобождается здесь; геометрия общая с кэшем.
  useEffect(
    () => () => {
      if (model.format !== 'stl') return;
      object.traverse((node) => {
        if (node instanceof Mesh)
          (node.material as MeshStandardMaterial).dispose();
      });
    },
    [object, model.format],
  );

  const placed = placeModel(model.box, footprint, fit);
  const standing = (
    <group rotation={[0, placed.yaw, 0]}>
      <group position={placed.position} scale={placed.scale}>
        <group rotation={[placed.upRotationX, 0, 0]}>
          <primitive object={object} />
        </group>
      </group>
    </group>
  );
  if (!lying) return standing;
  // Лёжа: четверть оборота вокруг x (макушкой назад, от взгляда), ужатая так, чтобы
  // целиком лечь в место, серединой в его центр. Глубина модели после поворота — её
  // толщина над полом, серединой на нуле: приподнимаем на половину, чтобы не уходила в пол.
  const height = placedHeight(model.box, footprint, fit);
  const shrink = lyingShrink(model.box, footprint, fit);
  const thickness = lyingThickness(model.box, footprint, fit, shrink);
  return (
    <group
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, thickness / 2, (-height * shrink) / 2]}
      scale={shrink}
    >
      {standing}
    </group>
  );
}

export default ModelFigure;
