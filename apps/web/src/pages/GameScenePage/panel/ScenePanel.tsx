import {
  ActionIcon,
  Badge,
  Indicator,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import classes from './ScenePanel.module.css';

export interface PanelTab<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  // Сколько нового во вкладке (записи журнала); 0 или нет — без числа.
  badge?: number;
}

function tabAriaLabel(item: { label: string; badge?: number }) {
  return item.badge ? `${item.label}, новых: ${item.badge}` : item.label;
}

interface ScenePanelProps<T extends string> {
  lobby: string;
  title: string;
  subtitle: string;
  // Вкладки «Игры»; в «Правке» вместо них body — свойства инструмента.
  tabs: readonly PanelTab<T>[];
  body?: ReactNode;
  tab: T;
  onTab: (tab: T) => void;
  collapsed: boolean;
  onCollapsed: (collapsed: boolean) => void;
  // Кнопка «?» с подсказками и горячими клавишами.
  help: ReactNode;
  // Что ещё стоит в шапке перед «?» (переключатель режима на телефоне).
  headerExtra?: ReactNode;
}

// Правая панель страницы сцены (docs/plan/scene-page.md, «Правая панель»): шапка одной
// строкой, вкладки и их содержимое. Свёрнутая на компьютере — узкая полоса значков
// вкладок (щелчок разворачивает на нужной), на телефоне — одна шапка под сценой.
function ScenePanel<T extends string>({
  lobby,
  title,
  subtitle,
  tabs,
  body,
  tab,
  onTab,
  collapsed,
  onCollapsed,
  help,
  headerExtra,
}: ScenePanelProps<T>) {
  // Та же граница, что у страницы: на ней панель уходит под сцену.
  const narrow = useMediaQuery('(max-width: 48em)');
  const lobbyLink = (
    <Tooltip label="В лобби" withArrow disabled={narrow}>
      <ActionIcon
        component={Link}
        to={lobby}
        variant="subtle"
        color="gray"
        aria-label="В лобби"
      >
        <IconArrowLeft size={18} />
      </ActionIcon>
    </Tooltip>
  );

  if (collapsed && !narrow) {
    return (
      <aside className={classes.rail} aria-label="Панель сцены свёрнута">
        <Tooltip label="Развернуть панель" position="left" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Развернуть панель"
            onClick={() => onCollapsed(false)}
          >
            <IconChevronsLeft size={18} />
          </ActionIcon>
        </Tooltip>
        <div className={classes.railLine} />
        {(body ? [] : tabs).map((item) => (
          <Tooltip
            key={item.value}
            label={item.label}
            position="left"
            withArrow
          >
            <Indicator
              label={item.badge}
              size={16}
              offset={4}
              disabled={!item.badge}
            >
              <ActionIcon
                variant={item.value === tab ? 'light' : 'subtle'}
                color={item.value === tab ? undefined : 'gray'}
                size="lg"
                aria-label={tabAriaLabel(item)}
                onClick={() => {
                  onTab(item.value);
                  onCollapsed(false);
                }}
              >
                {item.icon}
              </ActionIcon>
            </Indicator>
          </Tooltip>
        ))}
        <div className={classes.railSpacer} />
        {help}
        {lobbyLink}
      </aside>
    );
  }

  const current = tabs.find((item) => item.value === tab) ?? tabs[0];
  return (
    <aside className={classes.panel} data-collapsed={collapsed || undefined}>
      <header className={classes.header}>
        {lobbyLink}
        <div className={classes.heading}>
          <Text component="h2" className={classes.title} truncate>
            {title}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {subtitle}
          </Text>
        </div>
        {headerExtra}
        {help}
        <Tooltip
          label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          withArrow
          disabled={narrow}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
            aria-expanded={!collapsed}
            onClick={() => onCollapsed(!collapsed)}
          >
            {narrow ? (
              collapsed ? (
                <IconChevronUp size={18} />
              ) : (
                <IconChevronDown size={18} />
              )
            ) : (
              <IconChevronsRight size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </header>
      {!collapsed && (
        <>
          {!body && tabs.length > 1 && (
            <nav className={classes.tabs} aria-label="Вкладки панели">
              {tabs.map((item) => (
                <UnstyledButton
                  key={item.value}
                  className={classes.tab}
                  data-active={item.value === current?.value || undefined}
                  aria-pressed={item.value === current?.value}
                  aria-label={tabAriaLabel(item)}
                  onClick={() => onTab(item.value)}
                >
                  {item.label}
                  {!!item.badge && (
                    <Badge size="xs" circle={item.badge < 10} ml={4}>
                      {item.badge}
                    </Badge>
                  )}
                </UnstyledButton>
              ))}
            </nav>
          )}
          <div className={classes.content}>{body ?? current?.content}</div>
        </>
      )}
    </aside>
  );
}

export default ScenePanel;
