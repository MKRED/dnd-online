import {
  Alert,
  Badge,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useAuth } from '../../features/auth';
import { getProfile, type Profile } from '../../features/profile';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import ChangePasswordForm from './ChangePasswordForm';
import SetCredentialsForm from './SetCredentialsForm';

function ProfilePage() {
  usePageTitle('Профиль');
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

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="lg">
        Профиль
      </Title>
      {error ? (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      ) : !profile ? (
        <Loader />
      ) : (
        <Stack>
          <Card withBorder padding="lg">
            <Title order={3} mb="sm">
              Аккаунт
            </Title>
            <Stack gap="xs">
              <Group gap="xs">
                <Text c="dimmed">Ник:</Text>
                <Text fw={500}>{profile.nickname}</Text>
              </Group>
              {profile.providers.includes('lolka') && (
                <Group gap="xs">
                  <Text c="dimmed">Вход через лольку:</Text>
                  <Badge color="green" variant="light">
                    подключён
                  </Badge>
                </Group>
              )}
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Title order={3} mb="sm">
              Логин и пароль
            </Title>
            {profile.hasPassword ? (
              <Stack>
                <Group gap="xs">
                  <Text c="dimmed">Логин:</Text>
                  <Text fw={500}>{profile.login}</Text>
                </Group>
                <ChangePasswordForm />
              </Stack>
            ) : (
              <SetCredentialsForm onSaved={handleCredentialsSaved} />
            )}
          </Card>
        </Stack>
      )}
    </Container>
  );
}

export default ProfilePage;
