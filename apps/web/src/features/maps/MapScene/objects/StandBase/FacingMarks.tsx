import type { BufferGeometry } from 'three';
import type { FacingMarker } from 'shared';
import Overlay from './Overlay';
import {
  chevronGeometry,
  chevronOutlineGeometry,
  ringGeometry,
  tickGeometry,
  triangleGeometry,
  type ChevronSize,
} from './standShapes';
import { DARK, LIGHT } from './standStyle';

// Фигуры постоянные и одинаковые у всех жетонов: создаются один раз на модуль и живут
// всё время работы страницы, освобождать их некому и незачем.
const POINTER: ChevronSize = { tip: 0.62, arm: 0.1, thick: 0.06 };
const FRONT: ChevronSize = { tip: 0.42, arm: 0.12, thick: 0.06 };
const BACK: ChevronSize = { tip: 0.31, arm: 0.12, thick: 0.06 };
const SHAPES = {
  pointer: chevronGeometry(POINTER),
  pointerOutline: chevronOutlineGeometry(POINTER, 0.025),
  front: chevronGeometry(FRONT),
  frontOutline: chevronOutlineGeometry(FRONT, 0.022),
  back: chevronGeometry(BACK),
  backOutline: chevronOutlineGeometry(BACK, 0.022),
  ring: ringGeometry(0.39, 0.44),
  tick: tickGeometry(0.37, 0.46, 0.025),
  needle: triangleGeometry(0.34, 0.54, 0.1),
  needleOutline: triangleGeometry(0.31, 0.58, 0.135),
};
// Засечки компаса на семь направлений, кроме взгляда: через 45°.
const OTHER_TICKS = [1, 2, 3, 4, 5, 6, 7].map((i) => (i * Math.PI) / 4);

interface FacingMarksProps {
  marker: FacingMarker;
  // Высота слоя над подставкой в долях стороны.
  y: number;
}

// Отметка взгляда к северу; родитель поворачивает её по взгляду. У «указателя» сам
// нос подставки рисует StandBase, тут только шеврон в нём.
function FacingMarks({ marker, y }: FacingMarksProps) {
  const outline = (geometry: BufferGeometry) => (
    <Overlay geometry={geometry} y={y} order={3} color={DARK} opacity={0.75} />
  );
  const mark = (geometry: BufferGeometry, opacity?: number) => (
    <Overlay
      geometry={geometry}
      y={y * 1.05}
      order={4}
      color={LIGHT}
      opacity={opacity}
    />
  );
  if (marker === 'pointer') {
    return (
      <>
        {outline(SHAPES.pointerOutline)}
        {mark(SHAPES.pointer)}
      </>
    );
  }
  if (marker === 'chevrons') {
    return (
      <>
        {outline(SHAPES.frontOutline)}
        {outline(SHAPES.backOutline)}
        {mark(SHAPES.front)}
        {mark(SHAPES.back, 0.7)}
      </>
    );
  }
  return (
    <>
      <Overlay
        geometry={SHAPES.ring}
        y={y * 0.9}
        order={1}
        color={LIGHT}
        opacity={0.55}
      />
      {OTHER_TICKS.map((turn) => (
        <group key={turn} rotation={[0, turn, 0]}>
          <Overlay
            geometry={SHAPES.tick}
            y={y * 0.95}
            order={2}
            color={DARK}
            opacity={0.6}
          />
        </group>
      ))}
      {outline(SHAPES.needleOutline)}
      {mark(SHAPES.needle)}
    </>
  );
}

export default FacingMarks;
