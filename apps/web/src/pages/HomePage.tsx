import { Button, Group, Text } from '@mantine/core';
import { useAuth } from '../features/auth';

function HomePage() {
  const { user, logout } = useAuth();

  return (
    <>
      <h1>Hello world</h1>
      <Group>
        <Text>Привет, {user?.nickname}!</Text>
        <Button variant="light" onClick={() => void logout()}>
          Выйти
        </Button>
      </Group>
    </>
  );
}

export default HomePage;
