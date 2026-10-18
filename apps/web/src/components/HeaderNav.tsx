import { Burger, Button, Group, Loader, Menu, Text } from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth';

const NAV_LINKS = [
  { to: '/characters', label: 'Персонажи' },
  { to: '/maps', label: 'Карты' },
  // Справочник: предметы, способности, эффекты; ведёт на первый раздел.
  { to: '/items', label: 'Справочник' },
  { to: '/bookmarks', label: 'Закладки' },
];

// Правая часть шапки. На широком экране (от md) ссылки лежат в ряд; уже — четыре ссылки
// вместе с ником и «Выйти» не помещаются, поэтому уходят в меню.
function HeaderNav() {
  const { user, loading, logout } = useAuth();
  const [menuOpened, setMenuOpened] = useState(false);

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
    <>
      <Group gap="sm" wrap="nowrap" visibleFrom="md">
        {NAV_LINKS.map(({ to, label }) => (
          <Button key={to} component={Link} to={to} variant="subtle" size="sm">
            {label}
          </Button>
        ))}
        {/* Ник ведёт в профиль: там логин, пароль и способы входа. */}
        <Button
          component={Link}
          to="/profile"
          variant="subtle"
          size="sm"
          maw={200}
          title="Профиль"
        >
          <Text span inherit truncate>
            {user.nickname}
          </Text>
        </Button>
        <Button variant="subtle" size="sm" onClick={() => void logout()}>
          Выйти
        </Button>
      </Group>

      <Menu
        opened={menuOpened}
        onChange={setMenuOpened}
        position="bottom-end"
        width={220}
      >
        <Menu.Target>
          <Burger
            opened={menuOpened}
            size="sm"
            hiddenFrom="md"
            aria-label="Меню"
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>
            <Text span inherit truncate display="block">
              {user.nickname}
            </Text>
          </Menu.Label>
          {NAV_LINKS.map(({ to, label }) => (
            <Menu.Item key={to} component={Link} to={to}>
              {label}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item component={Link} to="/profile">
            Профиль
          </Menu.Item>
          <Menu.Item onClick={() => void logout()}>Выйти</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}

export default HeaderNav;
