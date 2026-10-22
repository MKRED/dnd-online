import {
  Alert,
  Avatar,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../features/auth';
import { getProfile, type Profile } from '../../../features/profile';
import { errorMessage } from '../../../lib/apiRequest';
import ChangePasswordForm from './ChangePasswordForm';
import SetCredentialsForm from './SetCredentialsForm';

// Раздел «Аккаунт»: кто вы и как входите. Без пароля (вход только через лольку)
// вместо смены пароля — форма, которая задаёт логин и пароль.
function AccountSection() {
  const { user, setUser } = useAuth();
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

  // Логин сменился — обновляем и пользователя в контексте, чтобы он не разошёлся с сервером.
  const handleCredentialsSaved = (saved: Profile) => {
    setProfile(saved);
    if (user && saved.login) setUser({ ...user, login: saved.login });
  };

  if (error)
    return (
      <Alert color="red" title="Ошибка">
        {error}
      </Alert>
    );
  if (!profile) return <Loader />;
  return (
    <Stack>
      <Card withBorder padding="lg" radius="md">
        <Group wrap="nowrap">
          <Avatar name={profile.nickname} color="initials" size="lg" />
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Text fw={600} size="lg" truncate>
              {profile.nickname}
            </Text>
            <Group gap="xs">
              {profile.login && (
                <Text size="sm" c="dimmed">
                  Логин: {profile.login}
                </Text>
              )}
              {profile.providers.includes('lolka') && (
                <Badge color="green" variant="light">
                  Лолька подключена
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="md">
          {profile.hasPassword ? 'Пароль' : 'Логин и пароль'}
        </Title>
        {profile.hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <SetCredentialsForm onSaved={handleCredentialsSaved} />
        )}
      </Card>
    </Stack>
  );
}

export default AccountSection;
