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
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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
  // DELETE отвечает 204 без тела — res.json() на нём бросил бы.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
