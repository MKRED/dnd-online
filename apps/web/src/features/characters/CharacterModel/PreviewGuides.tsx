import { useEffect, useMemo } from 'react';
import {
  facingArrowGeometry,
  LINEUP_TOP_FEET,
  lineupTexture,
} from './previewTextures';

// Сторона клетки — 5 футов (docs/plan/map.md, «1 блок = 5 футов»).
const FEET_PER_CELL = 5;
const ARROW_COLOR = '#d9822b';
// Доска стоит за клеткой вплотную к её заднему краю.
const BOARD_Z = 0.52;

// Ростовая доска за моделью, как на снимке задержанного: неподвижна и смотрит туда же,
// куда фигурка (к −z), — модель стоит перед ней лицом к зрителю. Сзади её не видно:
// подписи оттуда читались бы зеркально.
function LineupBoard({ levels }: { levels: number }) {
  const texture = useMemo(
    () => lineupTexture(levels * FEET_PER_CELL),
    [levels],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  // Высота доски в клетках — с полем над верхней линией.
  const height = levels + LINEUP_TOP_FEET / FEET_PER_CELL;
  return (
    <group position={[0, height / 2, BOARD_Z]} rotation={[0, Math.PI, 0]}>
      <mesh>
        <planeGeometry args={[1, height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Подсказки превью модели: стрелка взгляда на полу перед клеткой (лицо модели должно
// смотреть туда же) и ростовая доска за ней — видно, во сколько клеток и футов ростом
// модель на карте. Доска не ниже двух клеток.
function PreviewGuides({ height }: { height: number }) {
  const levels = Math.max(2, Math.ceil(height));
  const arrow = useMemo(() => facingArrowGeometry(), []);
  useEffect(() => () => arrow.dispose(), [arrow]);
  return (
    <group>
      <LineupBoard levels={levels} />
      {/* Фигура стрелки — в плоскости XY: поворот на пол уводит её +y в −z. */}
      <mesh
        geometry={arrow}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.004, 0]}
      >
        <meshBasicMaterial color={ARROW_COLOR} />
      </mesh>
    </group>
  );
}

export default PreviewGuides;
