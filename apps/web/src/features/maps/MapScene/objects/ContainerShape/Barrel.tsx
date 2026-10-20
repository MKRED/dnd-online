import { DoubleSide, Vector2 } from 'three';
import { DARK_WOOD, IRON, WOOD } from './containerColors';

const HEIGHT = 0.86;
const RIM = 0.25;
const BULGE = 0.07;

// Радиус бочки на высоте y: пузатая посередине.
const radiusAt = (y: number) => RIM + BULGE * Math.sin((Math.PI * y) / HEIGHT);

// Профиль для вращения: дно, пузатый бок, край и утопленная крышка.
const PROFILE = [
  new Vector2(0, 0),
  ...Array.from({ length: 11 }, (_, i) => {
    const y = (HEIGHT * i) / 10;
    return new Vector2(radiusAt(y), y);
  }),
  new Vector2(RIM - 0.03, HEIGHT),
  new Vector2(RIM - 0.03, HEIGHT - 0.03),
  new Vector2(0, HEIGHT - 0.03),
];

// Обручи — на этих высотах.
const HOOPS = [0.08, 0.3, 0.56, 0.78];

// Бочка: пузатый корпус с утопленной крышкой, четыре железных обруча и пробка на боку.
// Обе стороны граней рисуются: так не важно, в какую сторону обходит профиль.
function Barrel() {
  return (
    <>
      <mesh>
        <latheGeometry args={[PROFILE, 24]} />
        <meshStandardMaterial color={WOOD} side={DoubleSide} />
      </mesh>
      {HOOPS.map((y) => {
        const r = radiusAt(y) + 0.012;
        return (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[r, r, 0.05, 24, 1, true]} />
            <meshStandardMaterial
              color={IRON}
              metalness={0.6}
              roughness={0.5}
              side={DoubleSide}
            />
          </mesh>
        );
      })}
      <mesh
        position={[0, HEIGHT / 2, radiusAt(HEIGHT / 2)]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.04, 0.04, 0.05, 10]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
    </>
  );
}

export default Barrel;
