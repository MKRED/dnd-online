import {
  ActionIcon,
  Alert,
  Anchor,
  Divider,
  Group,
  Slider,
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
  // Заголовок над панелью: название инструмента или «Размер карты».
  panelTitle: string;
  // Карта не загрузилась — сцены нет.
  loadError: string | null;
  // Правка не прошла; сцена остаётся на месте.
  editError: string | null;
  // Пределы и текущее значение среза; null — карта ещё не загружена или пустая.
  cut: { min: number; max: number; value: number } | null;
  onCutChange: (y: number) => void;
  loaded: boolean;
  // Карта загружена, но в ней нет ни одного блока.
  empty: boolean;
  sceneReady: boolean;
  // Инструменты редактора.
  children: ReactNode;
}

// Правая панель страницы карты: карта, свойства инструмента и срез. Сами инструменты —
// на сцене (SceneToolbar), чтобы до них было ближе от того, что правишь.
function MapSidebar({
  name,
  size,
  onEditSize,
  panelTitle,
  loadError,
  editError,
  cut,
  onCutChange,
  loaded,
  empty,
  sceneReady,
  children,
}: MapSidebarProps) {
  return (
    <aside className={classes.sidebar}>
      <Stack gap="md">
        <Group justify="space-between" align="baseline" wrap="nowrap">
          <Title order={3}>{name}</Title>
          <Anchor component={Link} to="/maps" size="sm">
            Все карты
          </Anchor>
        </Group>

        {size && (
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

        {/* «Сцена готова» — сигнал для агента в браузере, что снимок можно делать. */}
        {loaded && (
          <Text size="xs" c="dimmed">
            {sceneReady ? 'Сцена готова.' : 'Загрузка сцены…'}
          </Text>
        )}

        {empty && (
          <Text c="dimmed" size="sm">
            Карта пустая. Выберите инструмент «Блок» (клавиша 2) и кликните по
            сетке.
          </Text>
        )}

        {loaded && (
          <>
            <Divider label={panelTitle} labelPosition="left" />
            {editError && <Alert color="red">{editError}</Alert>}
            {children}
          </>
        )}

        {/* Срез — внизу, под свойствами инструмента: его трогают реже, чем блок и поворот. */}
        {cut && (
          <Stack gap={4}>
            <Text size="sm">Срез по высоте: {cut.value}</Text>
            <Slider
              min={cut.min}
              max={cut.max}
              value={cut.value}
              onChange={onCutChange}
              label={null}
              thumbLabel="Срез по высоте"
            />
          </Stack>
        )}
      </Stack>
    </aside>
  );
}

export default MapSidebar;
