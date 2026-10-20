import { Button, Group, Loader, Menu, Text } from '@mantine/core';
import { IconChevronDown, IconLogout, IconUser } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth';

// Правая часть шапки: у вошедшего — ник с меню (профиль, выход), у гостя — вход и
// регистрация. Разделы приложения живут в боковой панели (AppNavbar), не здесь.
function UserMenu() {
  const { user, loading, logout } = useAuth();

  if (loading) return <Loader size="sm" />;

  if (!user) {
    return (
      <Group gap="sm" wrap="nowrap">
        <Button component={Link} to="/login" variant="subtle" size="sm">
          Войти
        </Button>
        {/* На узком экране остаётся только «Войти»: на регистрацию ведёт ссылка со страницы входа. */}
        <Button component={Link} to="/register" size="sm" visibleFrom="xs">
          Регистрация
        </Button>
      </Group>
    );
  }

  return (
    <Menu position="bottom-end" width={200}>
      <Menu.Target>
        <Button
          variant="subtle"
          size="sm"
          // На телефоне рядом бургер, логотип и тема — длинный ник обрезается раньше.
          maw={{ base: 130, xs: 200 }}
          rightSection={<IconChevronDown size={14} />}
        >
          <Text span inherit truncate>
            {user.nickname}
          </Text>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          to="/profile"
          leftSection={<IconUser size={16} />}
        >
          Профиль
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconLogout size={16} />}
          onClick={() => void logout()}
        >
          Выйти
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default UserMenu;
