import { useEffect } from 'react';

// Q опускает центр камеры на уровень, E поднимает. Клавиша — по event.code, то есть
// по месту на клавиатуре: в русской раскладке это Й и У, и они работают так же.
// В полях ввода и с Ctrl/Alt/Cmd клавиши не срабатывают (Ctrl+E — поиск браузера).
export function useCameraKeys(onShift: (dy: number) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTyping(event.target)) return;
      const dy = event.code === 'KeyE' ? 1 : event.code === 'KeyQ' ? -1 : 0;
      if (dy === 0) return;
      event.preventDefault();
      onShift(dy);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onShift]);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}
