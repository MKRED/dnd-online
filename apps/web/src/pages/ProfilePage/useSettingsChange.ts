import { useState } from 'react';
import type { UserSettings } from 'shared';
import { useAuth } from '../../features/auth';
import { updateSettings } from '../../features/profile';
import { errorMessage } from '../../lib/apiRequest';

// Смена настройки пользователя. Выбор сохраняется сразу, без кнопки: в контексте он
// меняется до ответа сервера, а при ошибке возвращается прежний.
export function useSettingsChange() {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = (patch: Partial<UserSettings>) => {
    if (!user) return;
    const before = user;
    setUser({ ...user, settings: { ...user.settings, ...patch } });
    setSaving(true);
    setError(null);
    updateSettings(patch)
      .then((settings) => setUser({ ...before, settings }))
      .catch((err: unknown) => {
        console.error('Failed to save settings', err);
        setUser(before);
        setError(errorMessage(err, 'Не удалось сохранить настройку'));
      })
      .finally(() => setSaving(false));
  };

  return { settings: user?.settings ?? null, saving, error, change };
}
