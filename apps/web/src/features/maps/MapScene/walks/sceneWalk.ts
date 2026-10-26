import type { Vec3 } from 'shared';

// Ход по пути на сцене (docs/plan/done/walk-animation.md): кого и как показать идущим.
// walk — путь из сообщения game:walked (null — кусок вне поля зрения игрока); hold — ход
// отправлен, путь ещё не пришёл: фигурка стоит на старом месте, а не прыгает на новое и
// обратно, когда ответ правки обгонит путь.
export type SceneWalk =
  | {
      kind: 'walk';
      seq: number;
      path: readonly (Vec3 | null)[];
      // performance.now() в момент, когда путь пришёл.
      startedAt: number;
    }
  | { kind: 'hold'; at: Vec3; startedAt: number };

// Ключ — фигурка персонажа или объект карты (монстр, НПС).
export type SceneWalks = ReadonlyMap<string, SceneWalk>;

export const figureWalkKey = (characterId: string) => `figure:${characterId}`;
export const objectWalkKey = (objectId: number) => `object:${objectId}`;

// Темп: клетка за STEP_MS, весь ход — не дольше WALK_MAX_MS (длинный путь с «Рывком»
// просто идёт быстрее). Выбрано по макету с пользователем 2026-10-24.
export const STEP_MS = 200;
export const WALK_MAX_MS = 2000;
// Прыжок через клетку — дуга такой высоты (в клетках) плюс доля перепада высоты, чтобы
// на уступ фигурка запрыгивала, а не въезжала в него.
export const HOP_HEIGHT = 0.22;
export const HOP_CLIMB = 0.6;

export function stepMs(steps: number): number {
  return steps > 0 ? Math.min(STEP_MS, WALK_MAX_MS / steps) : 0;
}

export function walkDuration(walk: SceneWalk): number {
  if (walk.kind === 'hold') return 0;
  const steps = walk.path.length - 1;
  return steps * stepMs(steps);
}
