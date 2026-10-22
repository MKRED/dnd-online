import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Group, type Texture } from 'three';
import { ANIMATION_FPS, requestAnimationFrameAt } from '../animationFrames';
import { useGraphicsQuality } from '../graphicsQualityContext';
import { SPIRIT_GAP, SPIRIT_SWAY, spiritSize } from './creaturePose';

const SPIRIT = '#d8ecff';

interface SpiritProps {
  // Ширина места существа в клетках: по ней размер призрака.
  footprint: number;
  // Высота, над которой он парит (верх гроба).
  floor: number;
  picture: Texture | null;
}

// Призрак над гробом поверженного: бледная полупрозрачная карточка с портретом, лицом по
// взгляду. На качестве «среднее» медленно покачивается вверх-вниз и поворачивается
// (18 кадров в секунду, animationFrames.ts); на «низком» висит на месте.
function Spirit({ footprint, floor, picture }: SpiritProps) {
  const fps = ANIMATION_FPS[useGraphicsQuality()];
  const { width, height } = spiritSize(footprint);
  const rest = floor + SPIRIT_GAP + height / 2;
  const group = useRef<Group>(null);
  // Поза — по времени, а не по числу кадров: при любой частоте призрак качается с той же
  // скоростью. Следующий кадр просит не сразу, а с частотой качества графики.
  useFrame((state) => {
    if (fps <= 0 || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = rest + Math.sin(t * 1.4) * SPIRIT_SWAY;
    group.current.rotation.y = Math.sin(t * 0.7) * 0.15;
    requestAnimationFrameAt(state.invalidate, fps);
  });
  // Прозрачный материал без записи глубины: иначе призрак закрывал бы портрет на
  // крышке и мерцал с ним.
  const material = (
    <meshBasicMaterial
      color={SPIRIT}
      map={picture}
      transparent
      opacity={0.45}
      depthWrite={false}
    />
  );
  return (
    <group ref={group} position={[0, rest, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={SPIRIT}
          transparent
          opacity={0.18}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      {picture && (
        <>
          <mesh position={[0, height * 0.1, -0.002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[width * 0.85, width * 0.85]} />
            {material}
          </mesh>
          <mesh position={[0, height * 0.1, 0.002]}>
            <planeGeometry args={[width * 0.85, width * 0.85]} />
            {material}
          </mesh>
        </>
      )}
    </group>
  );
}

export default Spirit;
