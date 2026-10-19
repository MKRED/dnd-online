import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

// Сообщает, что сцена отрисовала первый кадр. По этому сигналу страница пишет
// невидимую строку «Сцена готова» — её ждёт агент в браузере перед снимком, иначе
// он фотографирует загрузку (данные пришли, а canvas ещё пустой).
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // Кадр, в котором вызван useFrame, ещё рисуется — сигналим на следующем тике.
    requestAnimationFrame(onReady);
  });
  return null;
}

export default FirstFrame;
