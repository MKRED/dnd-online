import { useCallback, useMemo } from 'react';
import type { Box3 } from 'shared';
import {
  parseCameraParams,
  placeCamera,
  type CameraPlacement,
  type CameraQuery,
} from '../cameraView';
import type { CameraMemory } from './cameraMemory';

// Камера открытия страницы с 3D-картой. Ракурс из адреса важнее запомненного: ссылкой
// делятся видом, и нейросеть по ней всегда видит одну и ту же картинку. Без него —
// где камера стояла у этого человека перед обновлением страницы.
// Зависимости — строки из адреса и кадр открытия, а не весь searchParams: ни срез,
// ни новые блоки не должны сбрасывать камеру.
export function useRememberedCamera({
  frame,
  query,
  memory,
  placeId,
}: {
  frame: Box3 | null | undefined;
  query: CameraQuery;
  memory: CameraMemory;
  // Сцена или карта; null — ещё не загружена, запоминать некуда.
  placeId: string | null;
}) {
  const { view, cam, target } = query;
  const camera = useMemo(() => {
    if (!frame) return null;
    const asked = view !== null || cam !== null || target !== null;
    const saved = !asked && placeId ? memory.read(placeId) : null;
    return (
      saved ?? placeCamera(frame, parseCameraParams({ view, cam, target }))
    );
  }, [frame, view, cam, target, memory, placeId]);

  const remember = useCallback(
    (placement: CameraPlacement) => {
      if (placeId) memory.save(placeId, placement);
    },
    [memory, placeId],
  );

  return { camera, remember };
}
