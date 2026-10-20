import { AppShell, Anchor, Burger, Group } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import ColorSchemeToggle from '../ColorSchemeToggle';
import AppNavbar from './AppNavbar';
import UserMenu from './UserMenu';
import { useNavbarCollapsed } from './useNavbarCollapsed';

const NAVBAR_WIDTH = 220;
const NAVBAR_ICONS_WIDTH = 68;

// Каркас страниц: шапка (логотип, тема, меню пользователя) и боковая панель разделов.
// Разделы — в панели, а не в шапке: в шапке их становилось больше, чем помещалось.
// На широком экране панель сворачивается до иконок, на телефоне (уже sm) — шторка по
// бургеру. Гостю панель не нужна: ему доступны только вход и регистрация.
function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpened, mobile] = useDisclosure(false);
  const { collapsed, toggle } = useNavbarCollapsed(pathname);
  // Шторка телефона всегда с подписями, свёрнутость — только для широкого экрана.
  const wide = useMediaQuery('(min-width: 48em)', true);
  const iconsOnly = collapsed && wide;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        user
          ? {
              width: iconsOnly ? NAVBAR_ICONS_WIDTH : NAVBAR_WIDTH,
              breakpoint: 'sm',
              collapsed: { mobile: !mobileOpened },
            }
          : undefined
      }
    >
      <AppShell.Header>
        {/* nowrap: при переносе правая часть уезжала под шапку и накрывала страницу. */}
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            {user && (
              <Burger
                opened={mobileOpened}
                onClick={mobile.toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label={mobileOpened ? 'Закрыть меню' : 'Меню'}
              />
            )}
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
          </Group>

          <Group gap="xs" wrap="nowrap">
            <ColorSchemeToggle />
            <UserMenu />
          </Group>
        </Group>
      </AppShell.Header>

      {user && (
        <AppNavbar
          iconsOnly={iconsOnly}
          onToggle={toggle}
          onNavigate={mobile.close}
        />
      )}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
