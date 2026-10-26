import { useEffect } from 'react';

// Где «/» — это буква, а не команда: поле ввода, текст, редактируемый блок.
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

// «/» с любой страницы открывает поиск. По code, а не только по key: в русской раскладке
// на этой клавише точка, а искать хочется, не переключая раскладку. null — не слушать.
export function useSlashHotkey(onSlash: (() => void) | null) {
  useEffect(() => {
    if (!onSlash) return;
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Shift+клавиша «/» в английской раскладке — «?», это не поиск.
      const slash =
        event.key === '/' || (event.code === 'Slash' && !event.shiftKey);
      if (!slash || isTyping(event.target)) return;
      event.preventDefault();
      onSlash();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSlash]);
}
