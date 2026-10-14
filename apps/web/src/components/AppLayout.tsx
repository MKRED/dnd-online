import { AppShell, Anchor, Group } from '@mantine/core';
import { Link, Outlet } from 'react-router-dom';
import ColorSchemeToggle from './ColorSchemeToggle';
import HeaderNav from './HeaderNav';

// Общая шапка для всех страниц: показывает бренд слева и, в зависимости
// от статуса авторизации, либо навигацию с ником и выходом, либо ссылки на вход/регистрацию.
function AppLayout() {
  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        {/* nowrap: при переносе правая часть уезжала под шапку и накрывала страницу. */}
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Anchor
            component={Link}
            to="/"
            underline="never"
            fz="xl"
            fw={700}
            style={{ whiteSpace: 'nowrap' }}
          >
            DnD Online
          </Anchor>

          <Group gap="xs" wrap="nowrap">
            <ColorSchemeToggle />
            <HeaderNav />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
