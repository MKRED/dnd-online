import { createContext, useContext } from 'react';

// Свободный режим хода на сцене (docs/dnd/movement.md, «Free and tactical modes»): запас
// не тратится, вместо «осталось» — «до 30 фт за ход», «Рывка» и «Обновить запас» нет.
// Контекстом, а не пропсом: строка запаса стоит в четырёх местах страницы.
export const MoveModeContext = createContext<{ free: boolean }>({
  free: false,
});

export const useFreeMove = () => useContext(MoveModeContext).free;
