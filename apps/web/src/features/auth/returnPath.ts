import { useSearchParams } from 'react-router-dom';
import { safeReturnPath } from 'shared';

// Адрес, куда человек шёл, живёт в ?next= страниц входа и регистрации: переживает
// перезагрузку, переход между ними и вход через лольку (сервер вернёт туда же).

// Страница входа с запоминанием пути. Главную не запоминаем — на неё и так попадают.
export function loginPathFor(path: string): string {
  const next = safeReturnPath(path);
  return next && next !== '/'
    ? `/login?${new URLSearchParams({ next })}`
    : '/login';
}

// Тот же путь для ссылки на соседнюю страницу (вход ↔ регистрация, кнопка лольки).
export function withNext(path: string, next: string): string {
  return next === '/' ? path : `${path}?${new URLSearchParams({ next })}`;
}

// Куда вести после входа: проверенный ?next= или главная.
export function useNextPath(): string {
  const [searchParams] = useSearchParams();
  return safeReturnPath(searchParams.get('next')) ?? '/';
}
