import type { ComponentType } from 'react';
import type { ContainerLook, Facing, Point3 } from 'shared';
import { facingAngle } from '../objectLayout';
import Barrel from './Barrel';
import Chest from './Chest';
import Crate from './Crate';
import Sack from './Sack';

const SHAPES: Record<ContainerLook, ComponentType> = {
  chest: Chest,
  crate: Crate,
  barrel: Barrel,
  sack: Sack,
};

interface ContainerShapeProps {
  look: ContainerLook;
  facing: Facing;
  // Середина клетки на высоте пола.
  base: Point3;
}

// Контейнер — фигура по виду в одну клетку (docs/plan/done/map-objects.md). Фигуры
// построены передом (замком сундука) на юг (+z), а взгляд 0 — север, поэтому к углу
// взгляда добавлен разворот на 180°.
function ContainerShape({ look, facing, base }: ContainerShapeProps) {
  const Shape = SHAPES[look];
  return (
    <group position={base} rotation={[0, facingAngle(facing) + Math.PI, 0]}>
      <Shape />
    </group>
  );
}

export default ContainerShape;
