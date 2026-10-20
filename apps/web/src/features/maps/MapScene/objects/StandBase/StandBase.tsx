import type { Texture } from 'three';
import type { Facing } from 'shared';
import { facingAngle } from '../objectLayout';
import FacingMarks from './FacingMarks';
import Overlay from './Overlay';
import { FLAT, LIGHT } from './standStyle';
import { useFacingMarker } from './facingMarkerContext';
import {
  dropRimGeometry,
  roundBaseGeometry,
  tileNoseGeometry,
} from './standShapes';

// Красный — существу или старту здесь негде стоять (как фигурка «Хода»).
export const BLOCKED_COLOR = '#e03131';
// Подставка лежит над полом, слои над ней — выше на миллиметры, в клетках.
const BASE_Y = 0.02;

// Фигуры постоянные: создаются один раз на модуль (как в FacingMarks). Носов плитки
// восемь — по одному на направление.
const ROUND = roundBaseGeometry(false);
const DROP = roundBaseGeometry(true);
const DROP_RIM = dropRimGeometry();
const TILE_NOSES = new Map<Facing, ReturnType<typeof tileNoseGeometry>>();
function tileNose(facing: Facing) {
  let geometry = TILE_NOSES.get(facing);
  if (!geometry) {
    geometry = tileNoseGeometry(facingAngle(facing));
    TILE_NOSES.set(facing, geometry);
  }
  return geometry;
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

function BaseMaterial({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      transparent
      opacity={0.85}
      depthWrite={false}
    />
  );
}

// Подставка на полу: круг во всё место существа или квадратная плитка старта, и
// отметка взгляда того вида, что выбран в настройках пользователя (FacingMarks):
// «указатель» вытягивает саму подставку острым носом (у круга — капля со светлым
// ободом, у плитки — треугольник за краем) с шевроном в нём, «шевроны» — два шеврона
// у края, «компас» — кольцо с засечками и стрелкой. Все слои прозрачные и глубину не
// пишут, а прозрачное three.js сортирует по расстоянию до камеры — под иными углами
// подставка рисовалась бы поверх номера и отметки. renderOrder ставит их строго по
// порядку. Наведение на подставку показывает подсказку объекта (ObjectLayer);
// остальные слои луч пропускает. Фигуры — в долях стороны места (standShapes),
// группа масштабируется на size, поэтому высоты слоёв делятся на size.
function StandBase({ size, color, facing, texture, round }: StandBaseProps) {
  const marker = useFacingMarker();
  const angle = facing === undefined ? 0 : facingAngle(facing);
  const nose = facing !== undefined && marker === 'pointer';
  const y = (offset: number) => (BASE_Y + offset) / size;
  return (
    <group scale={size}>
      {round ? (
        <group rotation={[0, angle, 0]}>
          <mesh
            geometry={nose ? DROP : ROUND}
            position={[0, y(0), 0]}
            rotation={FLAT}
          >
            <BaseMaterial color={color} />
          </mesh>
          {nose && (
            <Overlay geometry={DROP_RIM} y={y(0.004)} order={1} color={LIGHT} />
          )}
        </group>
      ) : (
        <>
          <mesh position={[0, y(0), 0]} rotation={FLAT}>
            <planeGeometry args={[0.92, 0.92]} />
            <BaseMaterial color={color} />
          </mesh>
          {nose && (
            <mesh
              geometry={tileNose(facing)}
              position={[0, y(0), 0]}
              rotation={FLAT}
            >
              <BaseMaterial color={color} />
            </mesh>
          )}
        </>
      )}
      {texture && (
        <mesh
          position={[0, y(0.008), 0]}
          rotation={FLAT}
          raycast={() => null}
          renderOrder={2}
        >
          <planeGeometry args={[0.37, 0.37]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} />
        </mesh>
      )}
      {facing !== undefined && (
        <group rotation={[0, angle, 0]}>
          <FacingMarks marker={marker} y={y(0.012)} />
        </group>
      )}
    </group>
  );
}

export default StandBase;
