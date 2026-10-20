import { DARK_WOOD, LIGHT_WOOD } from './containerColors';

type Vec = [number, number, number];

const SIDE = 0.7;
const BEAM = 0.08;
const HALF = SIDE / 2;
const INNER = SIDE - BEAM * 2;

// Двенадцать брусьев по рёбрам: по четыре вдоль каждой оси.
const EDGES = [0, 1, 2].flatMap((axis) =>
  [-1, 1].flatMap((a) =>
    [-1, 1].map((b) => {
      const u = a * (HALF - BEAM / 2);
      const v = b * (HALF - BEAM / 2);
      const position: Vec =
        axis === 0 ? [0, u, v] : axis === 1 ? [u, 0, v] : [u, v, 0];
      const size: Vec = [BEAM, BEAM, BEAM];
      size[axis] = SIDE;
      return { key: `${axis}${a}${b}`, position, size };
    }),
  ),
);

// Боковые грани для раскосов: поворот грани вокруг вертикали.
const FACES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

// Ящик: светлые доски, тёмная рама из брусьев по рёбрам и раскос на каждой боковой
// грани.
function Crate() {
  return (
    <group position={[0, HALF, 0]}>
      <mesh>
        <boxGeometry args={[SIDE - 0.01, SIDE - 0.01, SIDE - 0.01]} />
        <meshStandardMaterial color={LIGHT_WOOD} />
      </mesh>
      {EDGES.map(({ key, position, size }) => (
        <mesh key={key} position={position}>
          <boxGeometry args={size} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      {FACES.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0, 0, HALF]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[INNER * Math.SQRT2, BEAM * 0.8, 0.03]} />
            <meshStandardMaterial color={DARK_WOOD} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default Crate;
