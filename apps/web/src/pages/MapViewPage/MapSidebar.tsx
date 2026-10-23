import {
  ActionIcon,
  Alert,
  Anchor,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { MapSize } from 'shared';
import { mapSizeLabel } from '../../features/maps';
import classes from './MapViewPage.module.css';

interface MapSidebarProps {
  name: string;
  // Размер карты; null — карта ещё не загружена.
  size: MapSize | null;
  // Открыть панель «Размер карты»; null — она уже открыта.
  onEditSize: (() => void) | null;
  // Название и размер карты — только в «Просмотре»: с инструментом правки панель
  // отдана его свойствам, а название и так в заголовке вкладки.
  showInfo: boolean;
  // Заголовок над панелью: «Размер карты»; null — у инструмента своя шапка.
  panelTitle: string | null;
  // Карта не загрузилась — сцены нет.
  loadError: string | null;
  // Правка не прошла; сцена остаётся на месте.
  editError: string | null;
  loaded: boolean;
  // Карта загружена, но в ней нет ни одного блока.
  empty: boolean;
  // Инструменты редактора.
  children: ReactNode;
}

// Правая панель страницы карты: карта и свойства инструмента. Сами инструменты и срез
// по высоте — на сцене (SceneToolbar, CutRuler), чтобы до них было ближе от того, что правишь.
function MapSidebar({
  name,
  size,
  onEditSize,
  showInfo,
  panelTitle,
  loadError,
  editError,
  loaded,
  empty,
  children,
}: MapSidebarProps) {
  return (
    <aside className={classes.sidebar}>
      <Stack gap="md">
        {showInfo && (
          <Group justify="space-between" align="baseline" wrap="nowrap">
            <Title order={3}>{name}</Title>
            <Anchor component={Link} to="/maps" size="sm">
              Все карты
            </Anchor>
          </Group>
        )}

        {showInfo && size && (
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text size="sm">{mapSizeLabel(size)}</Text>
            {onEditSize && (
              <Tooltip label="Изменить размер карты" withArrow>
                <ActionIcon
                  variant="subtle"
                  aria-label="Изменить размер карты"
                  onClick={onEditSize}
                >
                  <IconSettings size={18} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}

        {loadError && (
          <Alert color="red" title="Ошибка">
            {loadError}
          </Alert>
        )}

        {empty && (
          <Text c="dimmed" size="sm">
            Карта пустая. Выберите инструмент «Блок» (клавиша 2) и кликните по
            сетке.
          </Text>
        )}

        {loaded && (
          <>
            <Divider label={panelTitle ?? undefined} labelPosition="left" />
            {editError && <Alert color="red">{editError}</Alert>}
            {children}
          </>
        )}
      </Stack>
    </aside>
  );
}

export default MapSidebar;
