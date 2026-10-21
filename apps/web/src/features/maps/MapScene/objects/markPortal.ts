import { createContext, type RefObject } from 'react';

// Куда Html кладёт метки здоровья — обёртка холста (MapScene). Без неё он берёт элемент
// событий холста, который при загрузке сцены ещё меняется, и пересоздаёт свой корень
// посреди отрисовки (ошибка React в консоли).
export const MarkPortalContext =
  createContext<RefObject<HTMLElement | null> | null>(null);
