import { DoubleSide, Vector2 } from 'three';
import { BURLAP, ROPE } from './containerColors';

// Профиль мешка для вращения (радиус, высота): круглое дно, широкое брюхо, горловина,
// перетянутая верёвкой, и распушённый край над ней.
const PROFILE = [
  [0, 0],
  [0.18, 0.01],
  [0.27, 0.05],
  [0.31, 0.13],
  [0.31, 0.24],
  [0.27, 0.34],
  [0.19, 0.42],
  [0.1, 0.47],
  [0.065, 0.5],
  [0.08, 0.53],
  [0.12, 0.58],
  [0.13, 0.61],
  [0.09, 0.6],
  [0, 0.57],
].map(([r, y]) => new Vector2(r, y));

const NECK = 0.5;

// Мешок: мешковина с перетянутой горловиной. Граней вокруг мало и они плоские — ткань
// выглядит складками; мешок чуть сплюснут и завален набок, чтобы не казаться точёным.
function Sack() {
  return (
    <group rotation={[0.06, 0.4, -0.08]} scale={[1, 1, 0.85]}>
      <mesh>
        <latheGeometry args={[PROFILE, 9]} />
        <meshStandardMaterial
          color={BURLAP}
          roughness={1}
          flatShading
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, NECK, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.072, 0.022, 6, 14]} />
        <meshStandardMaterial color={ROPE} roughness={1} />
      </mesh>
      {/* Свисающий конец верёвки. */}
      <mesh position={[0.1, NECK - 0.06, 0.02]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.015, 0.015, 0.13, 6]} />
        <meshStandardMaterial color={ROPE} roughness={1} />
      </mesh>
    </group>
  );
}

export default Sack;
