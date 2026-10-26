import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { EventDispatcher, PerspectiveCamera, Vector3 } from 'three';
import type { CameraPlacement } from '../cameraView';

// MapControls из three-stdlib: точка вращения и событие «камера сдвинулась».
type WatchedControls = EventDispatcher<{ change: object }> & {
  target: Vector3;
};

// Как часто сообщать о камере: change идёт каждый кадр, пока крутят мышью, тормозит
// камера (плавное затухание MapControls) и идёт анимация центра (CameraFocus).
const SAVE_MS = 300;

// Сообщает, где встала камера, — странице, которая её запоминает (сцена игры после
// обновления страницы открывается с того же места).
function CameraWatch({
  onChange,
}: {
  onChange: (placement: CameraPlacement) => void;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const controls = useThree(
    (state) => state.controls,
  ) as unknown as WatchedControls | null;

  useEffect(() => {
    if (!controls) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const report = () => {
      timer = null;
      const { x, y, z } = camera.position;
      const { target } = controls;
      onChange({ position: [x, y, z], target: [target.x, target.y, target.z] });
    };
    // Не чаще раза в SAVE_MS, но последнее положение — всегда: таймер не сбрасывается
    // новым движением, иначе плавное торможение камеры откладывало бы запись секундами.
    const changed = () => {
      timer ??= setTimeout(report, SAVE_MS);
    };
    controls.addEventListener('change', changed);
    return () => {
      controls.removeEventListener('change', changed);
      // Ушли со страницы, пока камера ещё не встала, — последнее положение не теряется.
      if (timer) {
        clearTimeout(timer);
        report();
      }
    };
  }, [camera, controls, onChange]);

  return null;
}

export default CameraWatch;
