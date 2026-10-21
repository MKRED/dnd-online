import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Group, type Texture } from 'three';
import { useGraphicsQuality } from '../graphicsQualityContext';

const SPIRIT = '#d8ecff';

interface SpiritProps {
  // Ширина места существа в клетках: по ней размер призрака.
  footprint: number;
  // Высота, над которой он парит (верх гроба).
  floor: number;
  picture: Texture | null;
}

// Призрак над гробом поверженного: бледная полупрозрачная карточка с портретом, лицом по
// взгляду. На качестве «среднее» медленно покачивается вверх-вниз и поворачивается; на
// «низком» висит на месте.
function Spirit({ footprint, floor, picture }: SpiritProps) {
  const animate = useGraphicsQuality() !== 'low';
  // Размер растёт с местом, но у Большого и крупнее не дальше Среднего: высокий призрак
  // над огромным гробом с наклонной камеры заслонял бы соседние клетки.
  const width = Math.min(footprint, 1.2) * 0.5;
  const height = width * 1.3;
  const rest = floor + 0.15 + height / 2;
  const group = useRef<Group>(null);
  // Сцена рисует кадры по требованию (frameloop="demand"). Пока на ней есть
  // покачивающийся призрак, каждый кадр просит следующий — сцена перерисовывается
  // непрерывно. Этого и избегает качество «низкое».
  useFrame((state) => {
    if (!animate || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = rest + Math.sin(t * 1.4) * 0.06;
    group.current.rotation.y = Math.sin(t * 0.7) * 0.15;
    state.invalidate();
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
