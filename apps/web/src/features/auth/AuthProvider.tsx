import { useEffect, useState, type ReactNode } from 'react';
import { onSessionExpired, refreshSession } from '../../lib/session';
import { AuthApiError, getMe, logoutUser, type AuthUser } from './authApi';
import { AuthContext, type AuthContextValue } from './AuthContext';

// Module-level, а не useRef: React.StrictMode в dev дважды монтирует эффект,
// и без дедупликации на уровне модуля оба прохода шлют одинаковый refresh-запрос —
// сервер ротирует токен на первом и отклоняет второй как уже отозванный.
// Не сбрасывается после резолва: рассчитано на единственный AuthProvider на корне
// приложения за всё время жизни страницы. Если он когда-нибудь смонтируется повторно
// (тесты, второй инстанс), переиспользует уже устаревший результат вместо повторного запроса.
let inFlightBootstrap: Promise<AuthUser | null> | null = null;

async function bootstrapUser(): Promise<AuthUser | null> {
  try {
    const { user } = await getMe();
    return user;
  } catch (err: unknown) {
    if (!(err instanceof AuthApiError) || err.status !== 401) {
      console.error('Failed to fetch current user', err);
      return null;
    }
  }

  // 'expired' ожидаем (refresh-токен истёк/отсутствует — пользователь просто не
  // залогинен), сбои refreshSession логирует сам.
  if ((await refreshSession()) !== 'ok') return null;
  try {
    const { user } = await getMe();
    return user;
  } catch (err: unknown) {
    console.error('Failed to fetch current user after refresh', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    inFlightBootstrap ??= bootstrapUser();
    void inFlightBootstrap.then((resolvedUser) => {
      if (cancelled) return;
      setUser(resolvedUser);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Сессия истекла окончательно (refresh не помог) — сбрасываем пользователя,
  // RequireAuth отправит на страницу входа.
  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err: unknown) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = { user, loading, setUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
