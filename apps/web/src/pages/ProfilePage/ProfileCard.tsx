import { Alert, Avatar, Card, Skeleton, Stack, Text } from '@mantine/core';
import type { Profile } from '../../features/profile';
import { memberSince } from './memberSince';

interface ProfileCardProps {
  profile: Profile | null;
  error: string | null;
}

// Карточка игрока над меню разделов: кто вы для других — ник крупно, под ним логин
// (только если задан пароль: технический логин лольки ничего не скажет) и с каких пор
// вы с нами. Меняется ник в разделе «Аккаунт», карточка следует за ним.
function ProfileCard({ profile, error }: ProfileCardProps) {
  if (error)
    return (
      <Alert color="red" title="Ошибка">
        {error}
      </Alert>
    );
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack align="center" gap={6} ta="center">
        {profile ? (
          <>
            <Avatar
              name={profile.nickname}
              color="primary"
              variant="filled"
              size={72}
            />
            <Text
              ff="heading"
              fw={700}
              fz="lg"
              mt={4}
              maw="100%"
              style={{ overflowWrap: 'anywhere' }}
            >
              {profile.nickname}
            </Text>
            <Text size="sm" c="dimmed">
              {[profile.login, memberSince(profile.createdAt)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </>
        ) : (
          <>
            <Skeleton circle height={72} />
            <Skeleton height={20} width="60%" mt={4} />
            <Skeleton height={14} width="45%" />
          </>
        )}
      </Stack>
    </Card>
  );
}

export default ProfileCard;
