import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

// Предел кадров сцены из настроек графики (frameLimit): ноутбуку — меньше работы при
// вращении камеры. useFrame с приоритетом больше нуля забирает рисование у R3F: кадр
// рисуется здесь, не чаще предела. Пропущенный кадр просит следующий, чтобы последнее
// положение камеры всё-таки нарисовалось, — пустые тики дешёвые, рисования в них нет.
function FrameLimiter({ fps }: { fps: number }) {
  const last = useRef(-Infinity);
  useFrame((state) => {
    const now = performance.now();
    // Миллисекунда запаса: тики экрана чуть неровные, и при пределе 60 на 60-герцовом
    // экране иначе пропускался бы каждый второй.
    if (now - last.current >= 1000 / fps - 1) {
      last.current = now;
      state.gl.render(state.scene, state.camera);
    } else {
      state.invalidate();
    }
  }, 1);
  return null;
}

export default FrameLimiter;
