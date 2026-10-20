import type { UserSettings } from 'shared';
import { apiRequest } from '../../lib/apiRequest';

export interface Profile {
  // null — пароль ещё не задан (аккаунт создан входом через лольку).
  login: string | null;
  nickname: string;
  hasPassword: boolean;
  // Внешние способы входа: ['lolka'].
  providers: string[];
}

export function getProfile(): Promise<Profile> {
  return apiRequest('/profile');
}

export function setCredentials(input: {
  login: string;
  password: string;
}): Promise<Profile> {
  return apiRequest('/profile/credentials', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  return apiRequest('/profile/password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Меняет только переданные настройки и возвращает все настройки целиком.
export function updateSettings(
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  return apiRequest('/profile/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
