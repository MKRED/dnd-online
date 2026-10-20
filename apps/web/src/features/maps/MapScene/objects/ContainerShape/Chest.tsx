import { BRASS, DARK_WOOD, IRON, WOOD } from './containerColors';

const WIDTH = 0.8;
const DEPTH = 0.55;
const BODY = 0.4;
// Крышка — полуцилиндр, приплюснутый по высоте.
const LID_FLATTEN = 0.6;

// Сундук: ящик с выпуклой крышкой, две железные полосы через корпус и крышку, уголки
// и замок спереди — по замку видно, где у сундука перед.
function Chest() {
  return (
    <>
      <mesh position={[0, BODY / 2, 0]}>
        <boxGeometry args={[WIDTH, BODY, DEPTH]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <Lid radius={DEPTH / 2} length={WIDTH} color={DARK_WOOD} />
      {[-0.27, 0.27].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, BODY / 2, 0]}>
            <boxGeometry args={[0.06, BODY + 0.01, DEPTH + 0.02]} />
            <Iron />
          </mesh>
          <Lid radius={DEPTH / 2 + 0.012} length={0.06} color={IRON} metal />
        </group>
      ))}
      {/* Уголки на вертикальных рёбрах корпуса. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * WIDTH) / 2, BODY / 2, (sz * DEPTH) / 2]}
          >
            <boxGeometry args={[0.06, BODY + 0.01, 0.06]} />
            <Iron />
          </mesh>
        )),
      )}
      <mesh position={[0, BODY - 0.04, DEPTH / 2 + 0.015]}>
        <boxGeometry args={[0.13, 0.16, 0.03]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, BODY - 0.07, DEPTH / 2 + 0.032]}>
        <boxGeometry args={[0.03, 0.05, 0.01]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </>
  );
}

function Iron() {
  return <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />;
}

interface LidProps {
  radius: number;
  length: number;
  color: string;
  metal?: boolean;
}

// Полуцилиндр вдоль x на верху корпуса: ось цилиндра повёрнута из y в x, и половина
// thetaLength = π после поворота оказывается сверху.
function Lid({ radius, length, color, metal }: LidProps) {
  return (
    <group position={[0, BODY, 0]} scale={[1, LID_FLATTEN, 1]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry
          args={[radius, radius, length, 20, 1, false, 0, Math.PI]}
        />
        <meshStandardMaterial
          color={color}
          metalness={metal ? 0.6 : 0}
          roughness={metal ? 0.5 : 1}
        />
      </mesh>
    </group>
  );
}

export default Chest;
