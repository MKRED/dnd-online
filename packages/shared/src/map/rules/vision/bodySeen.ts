import type { MapState } from '../../mapState.js';
import { exposedSamplePoints } from '../cover.js';
import type { BodyBox } from '../creature.js';
import { boxDistance } from '../distance.js';
import { segmentBlocked } from '../segment.js';
import { bodyCells, rangeOf, viewerEyes, type Viewer } from './visibleCells.js';

// Видно ли существо хоть одному смотрящему: в пределах его дальности и не за полным
// укрытием в режиме «обзор» — то же, что выбор цели (docs/dnd/vision.md). Нужен лишь
// один свободный луч, поэтому долю укрытия не считаем и выходим на первом.
export function bodySeen(
  map: MapState,
  viewers: readonly Viewer[],
  body: BodyBox,
): boolean {
  const target = bodyCells(body);
  const points = exposedSamplePoints(map, body);
  return viewers.some((viewer) => {
    const range = rangeOf(viewer);
    if (range <= 0) return false;
    if (boxDistance(bodyCells(viewer.body), target) > range) {
      return false;
    }
    const eyes = viewerEyes(map, viewer);
    return eyes.some((eye) =>
      points.some((point) => !segmentBlocked(map, eye, point, 'sight')),
    );
  });
}
