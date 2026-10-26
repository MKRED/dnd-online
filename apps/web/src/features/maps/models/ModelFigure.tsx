import { useEffect, useMemo } from 'react';
import { Mesh, MeshStandardMaterial } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STL_DEFAULT_COLOR, type CharacterModelFit } from 'shared';
import FittedFigure from './FittedFigure';
import type { LoadedModel } from './loadModel';

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

// Файл модели, вписанный в место существа (docs/plan/done/character-models.md); как
// вписывать и класть, решает FittedFigure.
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

  return (
    <FittedFigure box={model.box} footprint={footprint} fit={fit} lying={lying}>
      <primitive object={object} />
    </FittedFigure>
  );
}

export default ModelFigure;
