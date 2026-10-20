import type { BufferGeometry } from 'three';
import { FLAT } from './standStyle';

interface OverlayProps {
  geometry: BufferGeometry;
  // Высота над полом в долях стороны (родитель масштабирован на size).
  y: number;
  order: number;
  color: string;
  opacity?: number;
}

// Плоский прозрачный слой поверх подставки; луч наведения его пропускает.
function Overlay({ geometry, y, order, color, opacity }: OverlayProps) {
  return (
    <mesh
      geometry={geometry}
      position={[0, y, 0]}
      rotation={FLAT}
      raycast={() => null}
      renderOrder={order}
    >
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity ?? 1}
        depthWrite={false}
      />
    </mesh>
  );
}

export default Overlay;
