import type { MapSize } from 'shared';

interface GroundGridProps {
  size: MapSize;
  // Сетка клеток — только при инструменте правки; граница карты видна всегда.
  showGrid: boolean;
}

const GRID_COLOR = '#4a4e57';
const BORDER_COLOR = '#e8a33d';

// Отрезки внутренних линий сетки: по одной на границу между клетками.
function gridLines({ width, depth }: MapSize): Float32Array {
  const points: number[] = [];
  for (let x = 1; x < width; x++) points.push(x, 0, 0, x, 0, depth);
  for (let z = 1; z < depth; z++) points.push(0, 0, z, width, 0, z);
  return new Float32Array(points);
}

function borderLines({ width, depth }: MapSize): Float32Array {
  const [w, d] = [width, depth];
  // prettier-ignore
  return new Float32Array([
    0, 0, 0, w, 0, 0,
    w, 0, 0, w, 0, d,
    w, 0, d, 0, 0, d,
    0, 0, d, 0, 0, 0,
  ]);
}

function Lines({
  points,
  color,
  y,
}: {
  points: Float32Array;
  color: string;
  y: number;
}) {
  return (
    <lineSegments position={[0, y, 0]} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

// Земля карты: сетка клеток в пределах ширины и глубины и граница по краю. Своими
// отрезками, а не gridHelper: тот бывает только квадратным.
function GroundGrid({ size, showGrid }: GroundGridProps) {
  // Ключ по размеру: R3F не пересоздаёт буфер при смене args у bufferAttribute.
  const key = `${size.width}x${size.depth}`;
  return (
    <group key={key}>
      {showGrid && (
        <Lines points={gridLines(size)} color={GRID_COLOR} y={0.002} />
      )}
      <Lines points={borderLines(size)} color={BORDER_COLOR} y={0.004} />
    </group>
  );
}

export default GroundGrid;
