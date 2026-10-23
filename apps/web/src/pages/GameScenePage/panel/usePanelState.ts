import { useState } from 'react';

// Свёрнута ли панель сцены (docs/plan/scene-page.md, «Правая панель») — привычка, одна на
// все игры, запоминается в браузере. Хранилище может быть недоступно (приватный
// режим) — тогда панель развёрнута.
const COLLAPSED_STORAGE_KEY = 'scene.panelCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
  } catch (err: unknown) {
    console.error('Failed to read the scene panel state', err);
    return false;
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch (err: unknown) {
    console.error('Failed to remember the scene panel state', err);
  }
}

// Свёрнута ли панель и открытая вкладка. Вкладка не запоминается: страница открывается
// на первой («Участники»).
export function usePanelState<T extends string>(firstTab: T) {
  const [collapsed, setCollapsedState] = useState(readCollapsed);
  const [tab, setTab] = useState<T>(firstTab);
  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    saveCollapsed(next);
  };
  // Щелчок по значку вкладки в свёрнутой полосе разворачивает панель на ней.
  const openTab = (next: T) => {
    setTab(next);
    if (collapsed) setCollapsed(false);
  };
  return { collapsed, setCollapsed, tab, openTab };
}
