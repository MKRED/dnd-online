import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, PerspectiveCamera, type Sprite } from 'three';
import { creatureHealthLabel, type CreatureHealth, type Point3 } from 'shared';
import { creaturePose, poseTop } from '../CreatureCard';
import { useHealthMarkStyle } from './healthMarkStyleContext';
import { markHeightCells } from './markSize';
import { useMarkTexture } from './markTexture';

interface HealthMarkProps {
  health: CreatureHealth;
  // Персонаж игрока: на нуле он без сознания, а не повержен.
  pc: boolean;
  // Середина места на высоте ног, верх стоящего существа и ширина места: метка встаёт
  // над позой — над стоящей карточкой, над лежащей, над призраком над гробом.
  base: Point3;
  top: number;
  footprint: number;
  // Верх позы над ногами, если его знает тот, кто рисует существо: у 3D-модели он свой,
  // а не как у карточки (poseTop).
  poseHeight?: number;
}

// Зазор между верхом позы и низом метки.
const GAP = 0.08;

// Метка здоровья над существом: «Ранен» (Bloodied, половина хитов или меньше),
// «Повержен», «Без сознания», «Погиб». Объект сцены, а не HTML поверх холста: прячется
// за стенами, не лезет на панели страницы и уменьшается с камерой (markSize.ts). Чисел
// здесь нет — их видит только тот, кто ведёт существо.
function HealthMark({
  health,
  pc,
  base,
  top,
  footprint,
  poseHeight,
}: HealthMarkProps) {
  const style = useHealthMarkStyle();
  const mark = useMarkTexture(style, creatureHealthLabel(health, pc), health);
  const sprite = useRef<Sprite>(null);
  const pose = creaturePose(health, pc);
  const y =
    base[1] + (poseHeight ?? poseTop(pose, footprint, top - base[1])) + GAP;

  // Размер — по тому, сколько пикселей занимает клетка там, где метка; прямо в объекте,
  // без перерисовки React на каждый кадр.
  useFrame(({ camera, size }) => {
    const node = sprite.current;
    if (!node || !mark || !(camera instanceof PerspectiveCamera)) return;
    const distance = camera.position.distanceTo(node.position);
    const cellPx =
      size.height /
      (2 * distance * Math.tan(MathUtils.degToRad(camera.fov) / 2));
    const height = markHeightCells(cellPx);
    node.visible = height !== null;
    if (height !== null) node.scale.set(height * mark.aspect, height, 1);
  });

  if (!mark) return null;
  return (
    <sprite
      ref={sprite}
      position={[base[0], y, base[2]]}
      // Низ плашки — над точкой: метка стоит над существом, а не врезается в него.
      center={[0.5, 0]}
      renderOrder={10}
      // Клики проходят к существу и клеткам под меткой.
      raycast={() => null}
    >
      <spriteMaterial
        map={mark.texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

export default HealthMark;
