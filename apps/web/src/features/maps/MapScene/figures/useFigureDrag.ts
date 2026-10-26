import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

// MapControls из three-stdlib: enabled = false — камера не слушает мышь.
type Switchable = { enabled: boolean };

// Сдвиг мыши (px), после которого нажатие — перетаскивание, а не щелчок.
const DRAG_THRESHOLD = 4;

export interface FigureDragHandlers {
  // Нажали мышью на фигурку, которую смотрящий водит.
  onGrab?: (id: string) => void;
  // Отпустили: dragged — мышь ушла дальше порога, иначе это был щелчок.
  onRelease?: (dragged: boolean) => void;
  // Касание (на телефоне перетаскивания нет) — выбрать или снять выбор.
  onSelect?: (id: string) => void;
  // Двойной щелчок — окно карточки персонажа (мастер в «Просмотре» «Правки»).
  onOpen?: (id: string) => void;
}

// Перетаскивание фигурки (docs/plan/done/game.md, этап 7) — как объекта в редакторе
// (useObjectDrag): нажатие выключает камеру до отпускания, куда отпустили — решает
// страница по последней клетке под курсором. Щелчок, который пришёл следом за нажатием
// мышью, уже обработан отпусканием и дальше не идёт.
export function useFigureDrag(handlers: FigureDragHandlers) {
  const controls = useThree(
    (state) => state.controls,
  ) as unknown as Switchable | null;
  // Отпускание приходит в window, уже после перерисовок, — берём свежие обработчики.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const grabbed = useRef(false);
  const release = useRef<(() => void) | null>(null);
  useEffect(() => () => release.current?.(), []);

  return (id: string, selectable: boolean) => ({
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      const { button, pointerType, altKey, clientX, clientY } =
        event.nativeEvent;
      if (!selectable || !latest.current.onGrab) return;
      if (button !== 0 || altKey || pointerType === 'touch') return;
      event.stopPropagation();
      grabbed.current = true;
      latest.current.onGrab(id);
      if (controls) controls.enabled = false;
      const finish = (up: PointerEvent) => {
        release.current?.();
        const moved =
          Math.hypot(up.clientX - clientX, up.clientY - clientY) >
          DRAG_THRESHOLD;
        latest.current.onRelease?.(up.type === 'pointerup' && moved);
        // Щелчок, если он будет, приходит сразу за отпусканием; отпустили над другим
        // объектом — щелчка нет, и следующее касание не должно потеряться.
        setTimeout(() => {
          grabbed.current = false;
        });
      };
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
      release.current = () => {
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        if (controls) controls.enabled = true;
        release.current = null;
      };
    },
    // Двойной щелчок — окно, а не центр камеры за фигуркой.
    ...(handlers.onOpen && {
      onDoubleClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        latest.current.onOpen?.(id);
      },
    }),
    // Щелчок по фигурке — не щелчок по клетке за ней.
    onClick: (event: ThreeEvent<MouseEvent>) => {
      if (!selectable) return;
      event.stopPropagation();
      if (grabbed.current) {
        grabbed.current = false;
        return;
      }
      latest.current.onSelect?.(id);
    },
  });
}
