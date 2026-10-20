import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { ObjectToolScene } from '../../editor/objects';
import type { HoverStore } from '../hoverStore';

// MapControls из three-stdlib: enabled = false — камера не слушает мышь.
type Switchable = { enabled: boolean };

// Сдвиг мыши (px), после которого нажатие — перетаскивание, а не клик. Без него клик
// по карточке переносил бы объект в клетку за ней (её и показывает строка координат).
const DRAG_THRESHOLD = 4;

// Выделение и перетаскивание объектов в инструменте «Объекты» (docs/plan/done/map-objects.md,
// «Правка — кликом и перетаскиванием»). ЛКМ по сцене двигает камеру, поэтому нажатие на
// объект выключает её до отпускания. Это работает, потому что обработчик R3F на canvas
// подписан раньше MapControls и успевает выключить камеру до её pointerdown.
// Куда отпустили — клетка из строки координат (hover): она уже знает, что под курсором.
// На телефоне перетаскивания нет: касание только выделяет, переносят кнопкой «Перенести».
export function useObjectDrag(tool: ObjectToolScene | null, hover: HoverStore) {
  const controls = useThree(
    (state) => state.controls,
  ) as unknown as Switchable | null;
  // Отпускание приходит в window, уже после перерисовок, — берём свежий инструмент.
  const latest = useRef(tool);
  useEffect(() => {
    latest.current = tool;
  });
  const release = useRef<(() => void) | null>(null);
  useEffect(() => () => release.current?.(), []);

  if (!tool) return () => ({});

  return (id: number) => ({
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      const { button, pointerType, altKey, clientX, clientY } =
        event.nativeEvent;
      if (button !== 0 || altKey || pointerType === 'touch') return;
      event.stopPropagation();
      tool.grab(id);
      if (controls) controls.enabled = false;
      const finish = (up: PointerEvent) => {
        release.current?.();
        const moved =
          Math.hypot(up.clientX - clientX, up.clientY - clientY) >
          DRAG_THRESHOLD;
        latest.current?.drop(
          up.type === 'pointerup' && moved ? hover.get() : null,
        );
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
    // Клик по объекту — не клик по клетке за ним: иначе он поставил бы там новый объект.
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      tool.select(id);
    },
  });
}
