import type { ReactNode } from 'react';
import type { CharacterModelFit } from 'shared';
import {
  lyingShrink,
  lyingThickness,
  placedHeight,
  placeModel,
  type ModelBox,
} from './modelFit';

interface FittedFigureProps {
  // Рамка содержимого в его собственных координатах.
  box: ModelBox;
  // Сторона места существа в клетках.
  footprint: number;
  fit: CharacterModelFit;
  // Без сознания: фигура ложится на спину в своё место, как карточка.
  lying?: boolean;
  children: ReactNode;
}

// Фигура, вписанная в место существа: центр основания — в начале координат группы,
// нижняя грань — на полу (docs/plan/done/character-models.md). Содержимое — файл модели
// (ModelFigure) или воксели модели монстра (VoxelFigure, docs/plan/done/monster-models.md).
// Поворот по взгляду и позу задаёт тот, кто ставит группу.
function FittedFigure({
  box,
  footprint,
  fit,
  lying = false,
  children,
}: FittedFigureProps) {
  const placed = placeModel(box, footprint, fit);
  const standing = (
    <group rotation={[0, placed.yaw, 0]}>
      <group position={placed.position} scale={placed.scale}>
        <group rotation={[placed.upRotationX, 0, 0]}>{children}</group>
      </group>
    </group>
  );
  if (!lying) return standing;
  // Лёжа: четверть оборота вокруг x (макушкой назад, от взгляда), ужатая так, чтобы
  // целиком лечь в место, серединой в его центр. Глубина фигуры после поворота — её
  // толщина над полом, серединой на нуле: приподнимаем на половину, чтобы не уходила в пол.
  const height = placedHeight(box, footprint, fit);
  const shrink = lyingShrink(box, footprint, fit);
  const thickness = lyingThickness(box, footprint, fit, shrink);
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

export default FittedFigure;
