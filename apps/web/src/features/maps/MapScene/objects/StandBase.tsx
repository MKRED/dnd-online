import { useEffect, useMemo } from 'react';
import { Shape, ShapeGeometry, type Texture } from 'three';
import type { Facing } from 'shared';
import { facingAngle } from './objectLayout';

// Красный — существу или старту здесь негде стоять (как фигурка «Хода»).
export const BLOCKED_COLOR = '#e03131';

// Стрелка взгляда: треугольник остриём к северу (−z) при повороте 0, в долях стороны.
function arrowGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0.48);
  shape.lineTo(0.2, 0.2);
  shape.lineTo(-0.2, 0.2);
  shape.closePath();
  return new ShapeGeometry(shape);
}

interface StandBaseProps {
  // Сторона места в клетках.
  size: number;
  color: string;
  facing?: Facing;
  // Картинка на самой подставке (номер старта).
  texture?: Texture | null;
  // Круг вместо квадрата — подставка фигурки существа; плитка старта квадратная.
  round?: boolean;
}

// Подставка на полу: круг во всё место существа или квадратная плитка старта, и
// стрелка взгляда. Все три прозрачные и глубину не пишут, а прозрачное three.js сортирует по
// расстоянию до камеры — под иными углами квадрат рисовался поверх номера и стрелки.
// renderOrder ставит их строго после квадрата. Наведение на подставку показывает
// подсказку объекта (ObjectLayer); номер и стрелку луч пропускает.
function StandBase({ size, color, facing, texture, round }: StandBaseProps) {
  const arrow = useMemo(() => arrowGeometry(), []);
  useEffect(() => () => arrow.dispose(), [arrow]);
  const side = size * 0.92;
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {round ? (
          <circleGeometry args={[side / 2, 48]} />
        ) : (
          <planeGeometry args={[side, side]} />
        )}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      {texture && (
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
          renderOrder={1}
        >
          <planeGeometry args={[side * 0.4, side * 0.4]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} />
        </mesh>
      )}
      {facing !== undefined && (
        <group rotation={[0, facingAngle(facing), 0]} scale={size}>
          <mesh
            geometry={arrow}
            position={[0, 0.035 / size, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={() => null}
            renderOrder={2}
          >
            <meshBasicMaterial color="#fff" depthWrite={false} transparent />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default StandBase;
