import { describe, expect, it } from 'vitest';
import {
  roundBaseGeometry,
  roundRimGeometry,
  tileNoseGeometry,
} from './standShapes';

function box(geometry: ReturnType<typeof roundBaseGeometry>) {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

describe('standShapes', () => {
  it('круглая подставка со взглядом вытянута носом к северу', () => {
    const b = box(roundBaseGeometry(true));
    expect(b.max.y).toBeCloseTo(0.69);
    expect(b.min.y).toBeCloseTo(-0.46);
    expect(b.max.x).toBeCloseTo(0.46);
  });

  it('без взгляда — простой круг, окантовка повторяет каплю', () => {
    expect(box(roundBaseGeometry(false)).max.y).toBeCloseTo(0.46);
    expect(box(roundRimGeometry(true)).max.y).toBeCloseTo(0.69);
  });

  it('нос плитки старта лежит за её краем и не перекрывает её', () => {
    const north = box(tileNoseGeometry(0));
    expect(north.min.y).toBeCloseTo(0.46);
    // Взгляд на северо-восток: нос опирается на угол плитки.
    // Все вершины — по ту сторону прямой через угол поперёк диагонали.
    const position = tileNoseGeometry(-Math.PI / 4).getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      expect(position.getX(i) + position.getY(i)).toBeGreaterThan(0.92 - 1e-6);
    }
  });
});
