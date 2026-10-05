import { API_BASE_URL } from './apiBaseUrl';

// ok — выданы новые токены; expired — refresh-токена нет или он отозван, нужен вход;
// failed — сбой сети или сервера: выходить из аккаунта из-за него не стоит.
export type RefreshOutcome = 'ok' | 'expired' | 'failed';

// Общий на все запросы: сервер ротирует refresh-токен при каждом обновлении
// и отклоняет повторное использование старого. Если несколько запросов разом
// получат 401, параллельные refresh выкинули бы пользователя — поэтому ждём один.
let inFlightRefresh: Promise<RefreshOutcome> | null = null;

async function requestRefresh(): Promise<RefreshOutcome> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err: unknown) {
    console.error('Session refresh failed', err);
    return 'failed';
  }
  if (res.ok) return 'ok';
  if (res.status === 401) return 'expired';
  console.error('Session refresh failed', res.status);
  return 'failed';
}

export function refreshSession(): Promise<RefreshOutcome> {
  inFlightRefresh ??= requestRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

const expiredListeners = new Set<() => void>();

// Подписка на окончательное истечение сессии (AuthProvider сбрасывает пользователя).
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  for (const listener of expiredListeners) listener();
}
