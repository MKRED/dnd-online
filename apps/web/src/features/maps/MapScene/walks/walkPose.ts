import type { Point3 } from 'shared';
import { HOP_CLIMB, HOP_HEIGHT, stepMs } from './sceneWalk';

export interface WalkPose {
  // Середина места на высоте ног — как base у фигурки.
  position: Point3;
  // Поворот вокруг вертикали по шагу (как facingAngle); null — шага нет, взгляд прежний.
  heading: number | null;
  // Вне поля зрения игрока существо не рисуется.
  visible: boolean;
  done: boolean;
}

// Поворот вокруг вертикали лицом от a к b: взгляд — локальный −z (CreatureCard), угол — как
// у facingAngle (stepFacing в shared считает те же градусы, только кратные 45).
export function headingOf(a: Point3, b: Point3): number | null {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  if (dx === 0 && dz === 0) return null;
  return -Math.atan2(dx, -dz);
}

const lastSeen = (points: readonly (Point3 | null)[]) =>
  [...points].reverse().find((p) => p !== null) ?? null;

// Поза в момент elapsed (мс от начала хода) — «прыжки по клеткам» (вариант Б макета,
// выбран пользователем 2026-10-24): каждую клетку фигурка перескакивает дугой, на уступ —
// выше. points — середины мест клеток пути; null — кусок вне поля зрения.
export function walkPose(
  points: readonly (Point3 | null)[],
  elapsed: number,
): WalkPose {
  const steps = points.length - 1;
  const end = points[steps];
  if (steps < 1 || elapsed >= steps * stepMs(steps)) {
    const position = end ?? lastSeen(points) ?? [0, 0, 0];
    return { position, heading: null, visible: end !== null, done: true };
  }
  const s = Math.max(0, elapsed) / stepMs(steps);
  const i = Math.min(Math.floor(s), steps - 1);
  const t = s - i;
  const a = points[i];
  const b = points[i + 1];
  if (!a || !b) {
    const position = a ?? b ?? lastSeen(points) ?? [0, 0, 0];
    return { position, heading: null, visible: false, done: false };
  }
  const arc =
    (HOP_HEIGHT + Math.abs(b[1] - a[1]) * HOP_CLIMB) * Math.sin(Math.PI * t);
  return {
    position: [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t + arc,
      a[2] + (b[2] - a[2]) * t,
    ],
    heading: headingOf(a, b),
    visible: true,
    done: false,
  };
}
