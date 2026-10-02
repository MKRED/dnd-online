import type { Box3 } from 'shared';
import { describe, expect, it } from 'vitest';
import { parseCameraParams, parseCutY, placeCamera } from './cameraView';

const bounds: Box3 = { min: [0, 0, 0], max: [9, 4, 9] };

function params(query: string) {
  const search = new URLSearchParams(query);
  return parseCameraParams({
    view: search.get('view'),
    cam: search.get('cam'),
    target: search.get('target'),
  });
}

describe('parseCameraParams', () => {
  it('по умолчанию — вид с юга, без точной камеры', () => {
    expect(params('')).toEqual({ view: 'south', cam: null, target: null });
  });

  it('разбирает ракурс и точные точки, отбрасывает мусор', () => {
    expect(params('view=top&cam=1,2,3&target=-4,0.5,6')).toEqual({
      view: 'top',
      cam: [1, 2, 3],
      target: [-4, 0.5, 6],
    });
    expect(params('view=up&cam=1,2&target=a,b,c')).toEqual({
      view: 'south',
      cam: null,
      target: null,
    });
  });
});

describe('parseCutY', () => {
  it('принимает только целые', () => {
    expect(parseCutY(new URLSearchParams('y=3'))).toBe(3);
    expect(parseCutY(new URLSearchParams('y=-1'))).toBe(-1);
    expect(parseCutY(new URLSearchParams('y=2.5'))).toBeNull();
    expect(parseCutY(new URLSearchParams('y='))).toBeNull();
    expect(parseCutY(new URLSearchParams(''))).toBeNull();
  });
});

describe('placeCamera', () => {
  it('вид с севера ставит камеру на север (-z) от центра', () => {
    const { position, target } = placeCamera(bounds, params('view=north'));
    expect(target).toEqual([5, 2.5, 5]);
    expect(position[2]).toBeLessThan(target[2]);
    expect(position[0]).toBe(target[0]);
  });

  it('вид с востока ставит камеру на восток (+x)', () => {
    const { position, target } = placeCamera(bounds, params('view=east'));
    expect(position[0]).toBeGreaterThan(target[0]);
  });

  it('вид сверху — над центром, север вверху экрана', () => {
    const { position, target } = placeCamera(bounds, params('view=top'));
    expect(position[1]).toBeGreaterThan(target[1]);
    expect(position[2]).toBeGreaterThan(target[2]);
    expect(position[2] - target[2]).toBeLessThan(0.1);
  });

  it('точная камера важнее ракурса', () => {
    expect(
      placeCamera(bounds, params('view=top&cam=1,2,3&target=4,5,6')),
    ).toEqual({ position: [1, 2, 3], target: [4, 5, 6] });
  });
});
