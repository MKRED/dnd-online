import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { Vector3 } from 'three';
import type { CameraPlacement } from '../cameraView';

// Минимум, который нужен от MapControls: точка, вокруг которой вращается камера.
interface OrbitLikeControls {
  target: Vector3;
  update: () => void;
}

// Ставит камеру в заданное положение — при открытии страницы и когда меняется
// ракурс в адресе. Между такими сменами камерой управляет пользователь, поэтому
// placement должен быть стабильным объектом (useMemo у вызывающего), иначе любая
// перерисовка сбрасывала бы камеру.
function CameraRig({ placement }: { placement: CameraPlacement }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree(
    (state) => state.controls,
  ) as OrbitLikeControls | null;
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    camera.position.set(...placement.position);
    if (controls) {
      controls.target.set(...placement.target);
      controls.update();
    } else {
      camera.lookAt(...placement.target);
    }
    invalidate();
  }, [camera, controls, invalidate, placement]);

  return null;
}

export default CameraRig;
