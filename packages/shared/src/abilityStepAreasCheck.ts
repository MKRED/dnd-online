import {
  AREA_FEET_MAX,
  type AreaOrigin,
  type AreaSpec,
} from './abilityStepAreas.js';
import { RANGE_FEET_MAX } from './abilitySteps.js';
import { isFeet, isObject, keysAre } from './abilityStepGuards.js';

// Проверка области шага: у каждой фигуры свой набор размеров в футах, кратных 5.
// Эманация — только от себя: она идёт от существа.

const SHAPE_KEYS: Record<AreaSpec['shape'], string[]> = {
  cone: ['length'],
  cube: ['size'],
  cylinder: ['height', 'radius'],
  emanation: ['distance'],
  line: ['length', 'width'],
  sphere: ['radius'],
};

function isOrigin(value: unknown): value is AreaOrigin {
  if (!isObject(value)) return false;
  if (value.kind === 'self') return keysAre(value, 'kind');
  return (
    value.kind === 'point' &&
    keysAre(value, 'feet,kind') &&
    isFeet(value.feet, RANGE_FEET_MAX)
  );
}

export function isArea(area: unknown, origin: unknown): boolean {
  if (!isObject(area) || !isOrigin(origin)) return false;
  if (!Object.hasOwn(SHAPE_KEYS, area.shape as string)) return false;
  const sizes = SHAPE_KEYS[area.shape as AreaSpec['shape']];
  return (
    keysAre(area, [...sizes, 'shape'].sort().join(',')) &&
    sizes.every((key) => isFeet(area[key], AREA_FEET_MAX)) &&
    (area.shape !== 'emanation' || origin.kind === 'self')
  );
}
