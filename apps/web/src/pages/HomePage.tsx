import { Container, Text, Title } from '@mantine/core';
import { useAuth } from '../features/auth';
import { usePageTitle } from '../lib/usePageTitle';

function HomePage() {
  usePageTitle();
  const { user } = useAuth();

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Добро пожаловать, {user?.nickname}!</Title>
      <Text c="dimmed" mt="sm">
        Здесь скоро появится список ваших партий и приглашений.
      </Text>
    </Container>
  );
}

export default HomePage;
