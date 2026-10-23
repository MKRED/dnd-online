import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Vitest globals выключены, поэтому Testing Library сама не вешает cleanup на
// afterEach — без этого DOM из одного теста копился бы в следующих.
afterEach(cleanup);

// findBy…/waitFor по умолчанию ждут 1 с. Без нагрузки этого хватает, но при параллельных
// прогонах jsdom отрисовывает большие формы дольше, и тесты падали через раз.
configure({ asyncUtilTimeout: 3000 });

// jsdom не реализует matchMedia и ResizeObserver, а Mantine их дёргает
// (цветовая схема, адаптивные компоненты) — без заглушек рендер падает.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;

// Нет в jsdom и document.fonts — на него подписывается Textarea autosize (форма персонажа).
Object.defineProperty(document, 'fonts', {
  value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
});

// И scrollIntoView нет: Combobox Mantine прокручивает к выбранному пункту по таймеру,
// уже после теста, — без заглушки это необработанная ошибка, и прогон падает целиком.
Element.prototype.scrollIntoView = vi.fn();
