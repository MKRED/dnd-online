import { describe, expect, it } from 'vitest';
import type { Point3 } from 'shared';
import { HOP_HEIGHT, STEP_MS, WALK_MAX_MS, stepMs } from './sceneWalk';
import { headingOf, walkPose } from './walkPose';

const line: Point3[] = [
  [0.5, 0, 0.5],
  [0.5, 0, 1.5],
  [0.5, 0.5, 2.5],
];

describe('stepMs', () => {
  it('короткий путь — клетка за STEP_MS', () => {
    expect(stepMs(3)).toBe(STEP_MS);
  });

  it('длинный путь укладывается в WALK_MAX_MS', () => {
    expect(stepMs(20) * 20).toBe(WALK_MAX_MS);
  });
});

describe('walkPose', () => {
  it('в начале — на первой клетке', () => {
    expect(walkPose(line, 0)).toEqual({
      position: line[0],
      heading: headingOf(line[0], line[1]),
      visible: true,
      done: false,
    });
  });

  it('середина шага — на полпути и в верхней точке дуги', () => {
    const pose = walkPose(line, STEP_MS / 2);
    expect(pose.position[0]).toBeCloseTo(0.5);
    expect(pose.position[2]).toBeCloseTo(1);
    expect(pose.position[1]).toBeCloseTo(HOP_HEIGHT);
  });

  it('на уступ дуга выше, чем по ровному', () => {
    const flat = walkPose(line, STEP_MS / 2).position[1];
    const up = walkPose(line, STEP_MS * 1.5).position[1] - 0.25;
    expect(up).toBeGreaterThan(flat);
  });

  it('в конце — на последней клетке, ход закончен', () => {
    expect(walkPose(line, STEP_MS * 2)).toEqual({
      position: line[2],
      heading: null,
      visible: true,
      done: true,
    });
  });

  it('кусок вне поля зрения не рисуется', () => {
    const fogged = [line[0], null, line[2]];
    expect(walkPose(fogged, STEP_MS * 0.5).visible).toBe(false);
    expect(walkPose(fogged, STEP_MS * 1.5).visible).toBe(false);
  });

  it('ушёл в туман — после хода не виден', () => {
    const away = [line[0], line[1], null];
    expect(walkPose(away, STEP_MS * 3)).toMatchObject({
      position: line[1],
      visible: false,
      done: true,
    });
  });
});

describe('headingOf', () => {
  // Взгляд на север (−z) — 0, как facingAngle(0); на восток (+x) — facingAngle(90).
  it('совпадает с facingAngle по сторонам света', () => {
    expect(headingOf([0, 0, 1], [0, 0, 0])).toBeCloseTo(0);
    expect(headingOf([0, 0, 0], [1, 0, 0])).toBeCloseTo(-Math.PI / 2);
  });

  it('шаг только по высоте — без поворота', () => {
    expect(headingOf([0, 0, 0], [0, 1, 0])).toBeNull();
  });
});
