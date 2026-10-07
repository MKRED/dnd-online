import { Edges } from '@react-three/drei';
import type { Point3 } from 'shared';

interface FrameBoxProps {
  // Углы коробки в мировых координатах (max — дальний угол, не клетка).
  min: Point3;
  max: Point3;
  color: string;
  opacity?: number;
}

// Полупрозрачная коробка с рёбрами: подсветка клеток редактора и тело фигурки.
// Луч сквозь неё проходит — выбор клеток идёт по блокам за ней.
function FrameBox({ min, max, color, opacity = 0.15 }: FrameBoxProps) {
  // Чуть больше, чтобы рамка не мерцала, совпадая с гранями блоков.
  const scale: Point3 = [
    max[0] - min[0] + 0.02,
    max[1] - min[1] + 0.02,
    max[2] - min[2] + 0.02,
  ];
  const center: Point3 = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  return (
    <mesh position={center} scale={scale} raycast={() => null}>
      <boxGeometry />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
      <Edges color={color} />
    </mesh>
  );
}

export default FrameBox;
