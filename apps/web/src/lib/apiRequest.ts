import { API_BASE_URL } from './apiBaseUrl';
import { notifySessionExpired, refreshSession } from './session';

// Ошибка API: message — то, что прислал сервер (на русском, показывается как есть).
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ErrorBody {
  message?: string | string[];
}

function send(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    // У FormData заголовок с boundary браузер ставит сам; JSON — всё остальное.
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : undefined,
    ...init,
  });
}

// Запрос с обновлением сессии; успешный ответ отдаётся как есть, чтобы вызывающий сам
// решил, читать его как JSON или как файл.
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let res = await send(path, init);
  // Access-токен живёт 15 минут, после чего браузер удаляет его cookie. Без
  // перезагрузки страницы его никто не обновит — делаем это здесь и повторяем
  // запрос один раз.
  if (res.status === 401) {
    const outcome = await refreshSession();
    if (outcome === 'ok') res = await send(path, init);
    else if (outcome === 'expired') notifySessionExpired();
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ErrorBody | null;
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Request failed');
    throw new ApiError(res.status, message);
  }
  return res;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiFetch(path, init);
  // DELETE отвечает 204 без тела — res.json() на нём бросил бы.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Бинарный ответ (картинка). Через тег <img> такое грузить нельзя: он не обновит
// истёкшую сессию, а fetch здесь — обновит.
export async function apiRequestBlob(path: string): Promise<Blob> {
  const res = await apiFetch(path);
  return res.blob();
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
