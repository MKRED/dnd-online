import { useLocalStorage } from '@mantine/hooks';
import { useState } from 'react';

// Страницы во весь экран (3D-карта): там панель свёрнута сама, чтобы не отнимать ширину
// у сцены, и выбор пользователя на других страницах не трогается.
const FULL_SCREEN = /^\/maps\/[^/]+$/;

// Свёрнута ли боковая панель на широком экране. Выбор запоминается в браузере; на
// странице во весь экран её можно развернуть, но только до ухода с этой страницы.
export function useNavbarCollapsed(pathname: string) {
  const [stored, setStored] = useLocalStorage({
    key: 'dnd-navbar-collapsed',
    defaultValue: false,
    getInitialValueInEffect: false,
  });
  // Адрес страницы во весь экран, где панель развернули руками.
  const [expandedAt, setExpandedAt] = useState<string | null>(null);
  const fullScreen = FULL_SCREEN.test(pathname);
  const collapsed = fullScreen ? expandedAt !== pathname : stored;

  const toggle = () => {
    if (fullScreen) setExpandedAt(collapsed ? pathname : null);
    else setStored(!stored);
  };
  return { collapsed, toggle };
}
