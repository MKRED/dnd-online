import type { ComponentType } from 'react';
import type { ContainerLook, Point3 } from 'shared';
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

// Контейнер — фигура по виду в одну клетку; вид только для картинки
// (docs/plan/done/map-objects.md). base — середина клетки на высоте пола, перед
// фигуры смотрит на юг (+z).
function ContainerShape({ look, base }: { look: ContainerLook; base: Point3 }) {
  const Shape = SHAPES[look];
  return (
    <group position={base}>
      <Shape />
    </group>
  );
}

export default ContainerShape;
