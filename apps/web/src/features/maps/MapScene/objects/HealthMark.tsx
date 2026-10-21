import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { use, useRef, type RefObject } from 'react';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { creatureHealthLabel, type CreatureHealth, type Point3 } from 'shared';
import classes from '../MapScene.module.css';
import { MarkPortalContext } from './markPortal';

interface HealthMarkProps {
  health: CreatureHealth;
  // Персонаж игрока: на нуле он без сознания, а не повержен.
  pc: boolean;
  // Середина места на высоте ног и верх стоящего существа: поверженное лежит, метка —
  // невысоко над ним.
  base: Point3;
  top: number;
}

// Цвет — классом: Html отдаёт div только className, остальные свойства — группе three.
const TONE: Record<CreatureHealth, string | undefined> = {
  bloodied: undefined,
  down: classes.healthDown,
  dead: classes.healthDead,
};

// Издалека метка не показывается: плашка в пикселях экрана не уменьшается с камерой,
// и над крошечными существами висели бы крупные надписи. Порог — сколько пикселей
// экрана занимает клетка там, где метка: так он не зависит от размера окна.
const MIN_CELL_PX = 20;

const markPoint = new Vector3();

// Метка здоровья над существом: «Ранен» (Bloodied, половина хитов или меньше),
// «Повержен», «Без сознания», «Погиб». Плашка в пикселях экрана, как подпись при
// наведении: читается при любом приближении, пока камера не слишком далеко. Чисел здесь нет — их видит только тот, кто
// ведёт существо.
function HealthMark({ health, pc, base, top }: HealthMarkProps) {
  const portal = use(MarkPortalContext);
  const mark = useRef<HTMLDivElement>(null);
  const y = health === 'bloodied' ? top + 0.15 : base[1] + 0.4;
  // Видимость — прямо в стиле, без перерисовки React на каждый кадр.
  useFrame(({ camera, size }) => {
    const el = mark.current;
    if (!el || !(camera instanceof PerspectiveCamera)) return;
    const distance = camera.position.distanceTo(
      markPoint.set(base[0], y, base[2]),
    );
    const cellPx =
      size.height /
      (2 * distance * Math.tan(MathUtils.degToRad(camera.fov) / 2));
    el.style.visibility = cellPx < MIN_CELL_PX ? 'hidden' : '';
  });
  if (!portal) return null;
  return (
    <Html
      ref={mark}
      position={[base[0], y, base[2]]}
      center
      // Типы drei ждут RefObject без null; обёртка к этому времени уже на странице.
      portal={portal as RefObject<HTMLElement>}
      // Под шторками и окнами страницы (у Mantine — 200): метки висят всё время.
      zIndexRange={[100, 0]}
      className={[classes.healthMark, TONE[health]].filter(Boolean).join(' ')}
    >
      {creatureHealthLabel(health, pc)}
    </Html>
  );
}

export default HealthMark;
