import { Html } from '@react-three/drei';
import { use, type RefObject } from 'react';
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

// Метка здоровья над существом: «Ранен» (Bloodied, половина хитов или меньше),
// «Повержен», «Без сознания», «Погиб». Плашка в пикселях экрана, как подпись при
// наведении: читается при любом приближении. Чисел здесь нет — их видит только тот, кто
// ведёт существо.
function HealthMark({ health, pc, base, top }: HealthMarkProps) {
  const portal = use(MarkPortalContext);
  if (!portal) return null;
  const y = health === 'bloodied' ? top + 0.15 : base[1] + 0.4;
  return (
    <Html
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
