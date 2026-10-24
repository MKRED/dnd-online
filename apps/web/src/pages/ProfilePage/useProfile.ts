import { useEffect, useState } from 'react';
import { getProfile, type Profile } from '../../features/profile';
import { errorMessage } from '../../lib/apiRequest';

// Профиль грузится один раз на всю страницу: его показывают и карточка игрока над
// меню, и раздел «Аккаунт», а смена ника или логина в разделе сразу видна в карточке.
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err: unknown) => {
        console.error('Failed to load profile', err);
        setError(errorMessage(err, 'Не удалось загрузить профиль'));
      });
  }, []);

  return { profile, error, setProfile };
}
