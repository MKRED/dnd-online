import type { ReactNode } from 'react';
import type { ContainerLook, Point3 } from 'shared';

const WOOD = '#8a5a2b';
const DARK_WOOD = '#6b4220';

// Контейнер — простая фигура по виду в одну клетку; вид только для картинки
// (docs/plan/done/map-objects.md). base — середина клетки на высоте пола.
function ContainerShape({ look, base }: { look: ContainerLook; base: Point3 }) {
  return <group position={base}>{SHAPES[look]}</group>;
}

const SHAPES: Record<ContainerLook, ReactNode> = {
  chest: (
    <>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.8, 0.44, 0.55]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.84, 0.14, 0.59]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      {/* Замок — по нему видно, где у сундука перед. */}
      <mesh position={[0, 0.4, 0.29]}>
        <boxGeometry args={[0.12, 0.14, 0.04]} />
        <meshStandardMaterial color="#d4a72c" metalness={0.6} roughness={0.4} />
      </mesh>
    </>
  ),
  crate: (
    <mesh position={[0, 0.36, 0]}>
      <boxGeometry args={[0.72, 0.72, 0.72]} />
      <meshStandardMaterial color="#b08850" />
    </mesh>
  ),
  barrel: (
    <>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.84, 20]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {[0.18, 0.66].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.315, 0.315, 0.06, 20]} />
          <meshStandardMaterial color="#555" metalness={0.5} />
        </mesh>
      ))}
    </>
  ),
  sack: (
    <mesh position={[0, 0.3, 0]} scale={[1, 0.85, 1]}>
      <sphereGeometry args={[0.34, 16, 12]} />
      <meshStandardMaterial color="#c2a878" />
    </mesh>
  ),
};

export default ContainerShape;
