import { useEffect, useRef } from 'react';

// Клавиши редактора карты по event.code — по месту на клавиатуре, а не по букве: так
// они работают и в русской раскладке (Q — это Й, R — К). В полях ввода и с
// Ctrl/Alt/Cmd не срабатывают: там свои сочетания (Ctrl+E — поиск браузера).
// active = false выключает все клавиши разом (например, пока открыта панель размера).
export function useKeyCodes(
  handlers: Record<string, () => void>,
  active = true,
) {
  // Обработчики — в ref: новый объект на каждой перерисовке не переподписывает window.
  const current = useRef(handlers);
  // Свежие обработчики — после каждой отрисовки (писать в ref во время отрисовки нельзя).
  useEffect(() => {
    current.current = handlers;
  });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTyping(event.target)) return;
      const handler = current.current[event.code];
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}
