import { useEffect, useRef } from 'react';

// Зажат ли Shift — для постановки обстановки без проверок места (docs/plan/blocks.md,
// «Пересечения»; Shift, а не Alt: Alt+клик в редакторе уже переносит центр камеры).
// Клик по сцене приходит в инструмент без события мыши, поэтому клавишу слушаем сами.
// В ref, а не в состоянии: нажатие не должно перерисовывать редактор. Уход со вкладки
// отпускает клавишу без keyup — сбрасываем по blur. Нажатие указателя тоже несёт
// shiftKey: Shift могли зажать, пока окно было без фокуса, и тогда keydown не придёт;
// слушаем в фазе захвата — раньше, чем клик дойдёт до сцены.
export function useShiftKey() {
  const shift = useRef(false);
  useEffect(() => {
    const onEvent = (event: KeyboardEvent | PointerEvent) => {
      shift.current = event.shiftKey;
    };
    const onBlur = () => {
      shift.current = false;
    };
    window.addEventListener('keydown', onEvent);
    window.addEventListener('keyup', onEvent);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerdown', onEvent, true);
    return () => {
      window.removeEventListener('pointerdown', onEvent, true);
      window.removeEventListener('keydown', onEvent);
      window.removeEventListener('keyup', onEvent);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return shift;
}
