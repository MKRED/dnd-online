import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

// Сообщает, что сцена отрисовала первый кадр после монтирования. MapScene монтирует его,
// когда догрузились картинки объектов. По этому сигналу страница пишет невидимую строку
// «Сцена готова» — её ждёт агент в браузере перед снимком, иначе он фотографирует
// загрузку (данные пришли, а canvas ещё пустой или карточки без картинок).
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  const invalidate = useThree((three) => three.invalidate);
  // Кадры рисуются по требованию: без запроса кадра сигнал ждал бы движения камеры.
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // Кадр, в котором вызван useFrame, ещё рисуется — сигналим на следующем тике.
    requestAnimationFrame(onReady);
  });
  return null;
}

export default FirstFrame;
