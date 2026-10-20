import {
  AppShell,
  Divider,
  NavLink,
  ScrollArea,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isNavActive, NAV_GROUPS } from './navItems';

interface AppNavbarProps {
  // Только иконки: панель свёрнута на широком экране. В шторке телефона подписи всегда.
  iconsOnly: boolean;
  onToggle: () => void;
  // Переход по пункту закрывает шторку на телефоне.
  onNavigate: () => void;
}

// Без подписи NavLink оставляет пустое тело и отступ у иконки — иконка уезжает влево.
const ICON_ONLY_STYLES = {
  root: { justifyContent: 'center' },
  section: { marginInlineEnd: 0 },
  body: { display: 'none' },
};

function AppNavbar({ iconsOnly, onToggle, onNavigate }: AppNavbarProps) {
  const { pathname } = useLocation();
  const ToggleIcon = iconsOnly
    ? IconLayoutSidebarLeftExpand
    : IconLayoutSidebarLeftCollapse;
  const toggleLabel = iconsOnly ? 'Развернуть меню' : 'Свернуть меню';

  return (
    <AppShell.Navbar p="xs" aria-label="Разделы">
      <AppShell.Section grow component={ScrollArea} scrollbars="y">
        {NAV_GROUPS.map((group, index) => (
          <Fragment key={group.label ?? index}>
            {index > 0 &&
              (group.label && !iconsOnly ? (
                <Text
                  size="xs"
                  c="dimmed"
                  fw={700}
                  tt="uppercase"
                  px="sm"
                  pt="md"
                  pb={4}
                >
                  {group.label}
                </Text>
              ) : (
                <Divider my="xs" />
              ))}
            {group.items.map(({ to, label, icon: Icon }) => (
              <Tooltip
                key={to}
                label={label}
                position="right"
                disabled={!iconsOnly}
                withArrow
              >
                <NavLink
                  component={Link}
                  to={to}
                  label={iconsOnly ? undefined : label}
                  aria-label={label}
                  leftSection={<Icon size={20} stroke={1.6} />}
                  active={isNavActive(pathname, to)}
                  onClick={onNavigate}
                  styles={iconsOnly ? ICON_ONLY_STYLES : undefined}
                />
              </Tooltip>
            ))}
          </Fragment>
        ))}
      </AppShell.Section>
      <AppShell.Section visibleFrom="sm">
        <Divider mb="xs" />
        <Tooltip
          label={toggleLabel}
          position="right"
          disabled={!iconsOnly}
          withArrow
        >
          <NavLink
            component="button"
            label={iconsOnly ? undefined : 'Свернуть'}
            aria-label={toggleLabel}
            leftSection={<ToggleIcon size={20} stroke={1.6} />}
            onClick={onToggle}
            styles={iconsOnly ? ICON_ONLY_STYLES : undefined}
            c="dimmed"
          />
        </Tooltip>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

export default AppNavbar;
