import { useEffect } from 'react';

const APP_NAME = 'DnD Online';

// Заголовок вкладки браузера: «Страница · DnD Online». Без названия — просто имя
// приложения. При уходе со страницы заголовок возвращается к имени приложения,
// чтобы на страницах без своего заголовка не оставался чужой.
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
