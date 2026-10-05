import {
  Alert,
  Anchor,
  Divider,
  Group,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import classes from './MapViewPage.module.css';

interface MapSidebarProps {
  name: string;
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

// Правая панель страницы карты: всё управление, чтобы сцена занимала остальной экран.
function MapSidebar({
  name,
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
            Карта пустая. Выберите инструмент «Блок» и кликните по сетке.
          </Text>
        )}

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

        {loaded && (
          <>
            <Divider label="Редактор" labelPosition="left" />
            {editError && <Alert color="red">{editError}</Alert>}
            {children}
          </>
        )}
      </Stack>
    </aside>
  );
}

export default MapSidebar;
