import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import type { EventDispatcher, Vector3 } from 'three';
import type { Point } from '../cameraView';
import {
  centerLevel,
  FOCUS_MS,
  LEVEL_MS,
  moveAt,
  startMove,
  type FocusMove,
} from './focusMove';

// Что сцена и страница могут сделать с точкой вращения.
export interface CameraFocusApi {
  // Плавно перенести центр в точку (двойной клик, Alt+клик).
  focusOn: (point: Point) => void;
  // Поднять (+1) или опустить (−1) центр на уровень вместе с камерой (Q/E, ▲▼).
  shiftLevel: (dy: number) => void;
}

// MapControls из three-stdlib: точка вращения и события «камера сдвинулась»
// (change) и «пользователь начал крутить» (start).
type FocusControls = EventDispatcher<{ change: object; start: object }> & {
  target: Vector3;
  update: () => void;
};

interface CameraFocusProps {
  apiRef: RefObject<CameraFocusApi | null>;
  // Уровень центра для подсказки «Центр: y = N»; зовётся при каждой его смене.
  onLevel: (level: number) => void;
}

const toPoint = (v: Vector3): Point => [v.x, v.y, v.z];

// Анимация переноса центра. Кадры рисуются по запросу (frameloop="demand"),
// поэтому, пока она идёт, каждый кадр просит следующий.
function CameraFocus({ apiRef, onLevel }: CameraFocusProps) {
  const camera = useThree((state) => state.camera);
  const controls = useThree(
    (state) => state.controls,
  ) as unknown as FocusControls | null;
  const invalidate = useThree((state) => state.invalidate);
  const move = useRef<FocusMove | null>(null);

  useEffect(() => {
    if (!controls) return;
    const report = () => onLevel(centerLevel(controls.target.y));
    // Пользователь сам потянул камеру — анимация уступает ему.
    const cancel = () => {
      move.current = null;
    };
    report();
    controls.addEventListener('change', report);
    controls.addEventListener('start', cancel);
    const begin = (toTarget: Point, durationMs: number) => {
      move.current = startMove(
        toPoint(controls.target),
        toPoint(camera.position),
        toTarget,
        performance.now(),
        durationMs,
      );
      invalidate();
    };
    apiRef.current = {
      focusOn: (point) => begin(point, FOCUS_MS),
      shiftLevel: (dy) => {
        // Нажатия подряд копятся: следующий уровень считаем от конца текущего переноса.
        const goal = move.current?.toTarget ?? toPoint(controls.target);
        begin([goal[0], goal[1] + dy, goal[2]], LEVEL_MS);
      },
    };
    return () => {
      controls.removeEventListener('change', report);
      controls.removeEventListener('start', cancel);
      apiRef.current = null;
    };
  }, [apiRef, camera, controls, invalidate, onLevel]);

  useFrame(() => {
    if (!move.current || !controls) return;
    const { target, position, done } = moveAt(move.current, performance.now());
    camera.position.set(...position);
    controls.target.set(...target);
    controls.update();
    if (done) move.current = null;
    else invalidate();
  });

  return null;
}

export default CameraFocus;
