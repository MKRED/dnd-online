import { Badge, Loader, Stack, Text } from '@mantine/core';
import { useAuth } from '../../../features/auth';
import type { Profile } from '../../../features/profile';
import NicknameRow from './NicknameRow';
import PasswordRow from './PasswordRow';
import { SettingRow, SettingsGroup } from './SettingRow';

interface AccountSectionProps {
  // Грузит страница профиля (useProfile): его же показывает карточка игрока.
  profile: Profile | null;
  onChange: (profile: Profile) => void;
}

// Раздел «Аккаунт» строками (вариант «Настройки списком», выбран пользователем
// 2026-10-24): что видят другие игроки — ник; как вы входите — логин, пароль, лолька.
function AccountSection({ profile, onChange }: AccountSectionProps) {
  const { user, setUser } = useAuth();
  if (!profile) return <Loader />;

  // Логин сменился — обновляем и пользователя в контексте, чтобы он не разошёлся с сервером.
  const handleCredentialsSaved = (saved: Profile) => {
    onChange(saved);
    if (user && saved.login) setUser({ ...user, login: saved.login });
  };
  const lolka = profile.providers.includes('lolka');

  return (
    <Stack>
      <SettingsGroup caption="Для других игроков">
        <NicknameRow profile={profile} onSaved={onChange} />
      </SettingsGroup>
      <SettingsGroup caption="Вход">
        {profile.login && (
          <SettingRow label="Логин" hint="Только для входа, другим не виден">
            <Text size="lg">{profile.login}</Text>
          </SettingRow>
        )}
        <PasswordRow
          profile={profile}
          onCredentialsSaved={handleCredentialsSaved}
        />
        <SettingRow label="Лолька">
          {lolka ? (
            <Badge color="green" variant="light">
              Подключена
            </Badge>
          ) : (
            <Text c="dimmed">Не подключена</Text>
          )}
        </SettingRow>
      </SettingsGroup>
    </Stack>
  );
}

export default AccountSection;
