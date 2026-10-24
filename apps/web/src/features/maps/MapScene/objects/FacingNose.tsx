import type { Facing, Point3 } from 'shared';
import { triangleGeometry } from './StandBase/standShapes';
import { facingAngle } from './objectLayout';

// Треугольник к северу в плоскости фигуры; родитель кладёт его на пол и поворачивает.
const NOSE = triangleGeometry(0, 0.42, 0.26);
const NOSE_OUTLINE = triangleGeometry(-0.06, 0.5, 0.34);
// Насколько носик отступает от края места наружу.
const GAP = 0.08;

interface FacingNoseProps {
  // Середина места на высоте пола.
  base: Point3;
  // Половина места по x и по z.
  half: [number, number];
  facing: Facing;
  color: string;
}

// Носик взгляда за передней стороной места (вариант В артборда «Н1», 2026-10-24,
// docs/plan/scene-page.md): у ставящегося объекта под курсором и у выделенного. Лежит чуть
// над полом; оба треугольника прозрачные, чтобы рисоваться в одном проходе по renderOrder
// (непрозрачная заливка ушла бы под обводку). Полупрозрачный призрак глубину не пишет —
// носик сквозь него виден.
function FacingNose({ base, half, facing, color }: FacingNoseProps) {
  const angle = (facing * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dz = -Math.cos(angle);
  // До края места по направлению взгляда: у диагонали — до угла.
  const reach = Math.abs(dx) * half[0] + Math.abs(dz) * half[1] + GAP;
  return (
    <group
      position={[base[0] + dx * reach, base[1] + 0.04, base[2] + dz * reach]}
      rotation={[0, facingAngle(facing), 0]}
    >
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={NOSE_OUTLINE} renderOrder={10} raycast={() => null}>
          <meshBasicMaterial
            color="#1d160b"
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
        <mesh geometry={NOSE} renderOrder={11} raycast={() => null}>
          <meshBasicMaterial color={color} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export default FacingNose;
