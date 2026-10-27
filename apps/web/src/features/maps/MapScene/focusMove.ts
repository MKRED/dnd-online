import type { Point } from '../cameraView';

// Перенос точки вращения: камера едет вместе с ней на тот же сдвиг, поэтому
// расстояние и угол обзора не меняются (docs/plan/done/map-editor.md, «Камера»).

export interface FocusMove {
  fromTarget: Point;
  toTarget: Point;
  fromPosition: Point;
  startedAt: number;
  durationMs: number;
}

// Перенос центра по двойному клику и подъём на уровень по Q/E — разной длины:
// клавишу жмут подряд, и долгая анимация отставала бы от нажатий.
export const FOCUS_MS = 350;
export const LEVEL_MS = 120;

export function startMove(
  target: Point,
  position: Point,
  toTarget: Point,
  now: number,
  durationMs: number,
): FocusMove {
  return {
    fromTarget: target,
    toTarget,
    fromPosition: position,
    startedAt: now,
    durationMs,
  };
}

// Плавный старт без рывка в конце: быстро трогается и мягко останавливается.
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// Положение в момент now; done — анимация закончилась.
export function moveAt(
  move: FocusMove,
  now: number,
): { target: Point; position: Point; done: boolean } {
  const t = Math.min(Math.max((now - move.startedAt) / move.durationMs, 0), 1);
  const k = easeOutCubic(t);
  const shift = move.toTarget.map((v, axis) => (v - move.fromTarget[axis]) * k);
  const add = (p: Point): Point => [
    p[0] + shift[0],
    p[1] + shift[1],
    p[2] + shift[2],
  ];
  return {
    target: add(move.fromTarget),
    position: add(move.fromPosition),
    done: t >= 1,
  };
}
