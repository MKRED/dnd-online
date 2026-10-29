import { Html } from '@react-three/drei';
import { useRef } from 'react';
import { Vector3, type Camera, type Object3D } from 'three';
import type { Point3 } from 'shared';
import FrameBox from '../FrameBox';
import classes from '../MapScene.module.css';
import { TONE_COLORS, type SceneTargetMark } from './sceneTargets';

interface TargetMarkerProps {
  // Середина места на высоте ног, ширина основания и верх — как у объектов сцены.
  base: Point3;
  footprint: number;
  top: number;
  mark: SceneTargetMark;
  selected: boolean;
}

const GAP = 8;
const anchor = new Vector3();

// Цель под курсором или выбранная: рамка цвета «можно / с помехой / нельзя» и строка
// сбоку. Остальные цели не подсвечены (решение Михаила 2026-10-28, вопросы 1 и 2).
function TargetMarker({
  base,
  footprint,
  top,
  mark,
  selected,
}: TargetMarkerProps) {
  const label = useRef<HTMLDivElement>(null);
  const h = footprint / 2;
  const [x, y, z] = base;
  const color = TONE_COLORS[mark.tone];
  // Строка — справа от правого края цели, у её верха: над дальним рядом она уходила под
  // полосу очерёдности, а сбоку и ближе к курсору. У правого края экрана (телефон)
  // сдвигается влево, чтобы не обрезаться.
  const place = (
    el: Object3D,
    camera: Camera,
    size: { width: number; height: number },
  ) => {
    anchor.setFromMatrixPosition(el.matrixWorld).project(camera);
    const px = ((anchor.x + 1) / 2) * size.width;
    const py = ((1 - anchor.y) / 2) * size.height;
    // Кадры рисуются по требованию: в первом кадре строки ещё нет в DOM, а следующего
    // может не быть — тогда ширина по числу букв (жирный 13px).
    const width = label.current?.offsetWidth || mark.label.length * 7.5 + 12;
    const height = label.current?.offsetHeight || 22;
    return [
      Math.max(0, Math.min(px + GAP, size.width - width - GAP)),
      py - height / 2,
    ];
  };
  return (
    <>
      <FrameBox
        min={[x - h, y, z - h]}
        max={[x + h, top, z + h]}
        color={color}
        opacity={selected ? 0.3 : 0.12}
      />
      <Html
        ref={label}
        position={[x + h, top - 0.2, z]}
        calculatePosition={place}
        className={classes.label}
        style={{ boxShadow: `inset 0 -2px 0 ${color}` }}
      >
        {mark.label}
      </Html>
    </>
  );
}

export default TargetMarker;
