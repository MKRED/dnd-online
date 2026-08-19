import { AppShell, Anchor, Button, Group, Loader, Text } from '@mantine/core';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth';

// Общая шапка для всех страниц: показывает бренд слева и, в зависимости
// от статуса авторизации, либо ник + выход, либо ссылки на вход/регистрацию.
function AppLayout() {
  const { user, loading, logout } = useAuth();

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Anchor
            component={Link}
            to="/"
            underline="never"
            fz="xl"
            fw={700}
            c="arcane.4"
          >
            DnD Online
          </Anchor>

          {loading ? (
            <Loader size="sm" />
          ) : user ? (
            <Group gap="sm">
              <Text fw={500}>{user.nickname}</Text>
              <Button variant="subtle" size="sm" onClick={() => void logout()}>
                Выйти
              </Button>
            </Group>
          ) : (
            <Group gap="sm">
              <Button component={Link} to="/login" variant="subtle" size="sm">
                Войти
              </Button>
              <Button component={Link} to="/register" size="sm">
                Регистрация
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
