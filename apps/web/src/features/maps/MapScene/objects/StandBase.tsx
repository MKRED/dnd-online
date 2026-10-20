import { useEffect, useMemo } from 'react';
import type { BufferGeometry, Texture } from 'three';
import type { Facing } from 'shared';
import { facingAngle } from './objectLayout';
import {
  chevronGeometry,
  chevronOutlineGeometry,
  roundBaseGeometry,
  roundRimGeometry,
  tileNoseGeometry,
} from './standShapes';

// Красный — существу или старту здесь негде стоять (как фигурка «Хода»).
export const BLOCKED_COLOR = '#e03131';
const LIGHT = '#f8f9fa';
const DARK = '#1a1b1e';
// Подставка лежит над полом, слои над ней — выше на миллиметры, в клетках.
const BASE_Y = 0.02;
const FLAT = [-Math.PI / 2, 0, 0] as const;

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

// Своя геометрия освобождается, когда её сменили или компонент ушёл со сцены.
function useDispose(geometry: BufferGeometry) {
  useEffect(() => () => geometry.dispose(), [geometry]);
}

// Плоский прозрачный слой поверх подставки; луч наведения его пропускает.
function Overlay(props: {
  geometry: BufferGeometry;
  y: number;
  order: number;
  color: string;
  opacity?: number;
}) {
  return (
    <mesh
      geometry={props.geometry}
      position={[0, props.y, 0]}
      rotation={FLAT}
      raycast={() => null}
      renderOrder={props.order}
    >
      <meshBasicMaterial
        color={props.color}
        transparent
        opacity={props.opacity ?? 1}
        depthWrite={false}
      />
    </mesh>
  );
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

// Подставка на полу: круг во всё место существа или квадратная плитка старта.
// Взгляд показывает острый «нос» подставки и белый шеврон с тёмной обводкой в нём,
// у круга ещё светлый обод. Все слои прозрачные и глубину не пишут, а прозрачное
// three.js сортирует по расстоянию до камеры — под иными углами подставка рисовалась
// бы поверх номера и шеврона. renderOrder ставит их строго по порядку. Наведение на
// подставку показывает подсказку объекта (ObjectLayer); остальные слои луч пропускает.
// Фигуры — в долях стороны места (standShapes), группа масштабируется на size, поэтому
// высоты слоёв делятся на size.
function StandBase({ size, color, facing, texture, round }: StandBaseProps) {
  const angle = facing === undefined ? 0 : facingAngle(facing);
  const withNose = facing !== undefined;
  const roundBase = useMemo(() => roundBaseGeometry(withNose), [withNose]);
  const rim = useMemo(() => roundRimGeometry(withNose), [withNose]);
  const tileNose = useMemo(() => tileNoseGeometry(angle), [angle]);
  const chevron = useMemo(() => chevronGeometry(), []);
  const outline = useMemo(() => chevronOutlineGeometry(), []);
  useDispose(roundBase);
  useDispose(rim);
  useDispose(tileNose);
  useDispose(chevron);
  useDispose(outline);
  const y = (offset: number) => (BASE_Y + offset) / size;
  return (
    <group scale={size}>
      {round ? (
        <group rotation={[0, angle, 0]}>
          <mesh geometry={roundBase} position={[0, y(0), 0]} rotation={FLAT}>
            <BaseMaterial color={color} />
          </mesh>
          <Overlay geometry={rim} y={y(0.004)} order={1} color={LIGHT} />
        </group>
      ) : (
        <>
          <mesh position={[0, y(0), 0]} rotation={FLAT}>
            <planeGeometry args={[0.92, 0.92]} />
            <BaseMaterial color={color} />
          </mesh>
          {withNose && (
            <mesh geometry={tileNose} position={[0, y(0), 0]} rotation={FLAT}>
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
      {withNose && (
        <group rotation={[0, angle, 0]}>
          <Overlay
            geometry={outline}
            y={y(0.012)}
            order={3}
            color={DARK}
            opacity={0.75}
          />
          <Overlay geometry={chevron} y={y(0.014)} order={4} color={LIGHT} />
        </group>
      )}
    </group>
  );
}

export default StandBase;
