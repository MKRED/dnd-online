import {
  Alert,
  Anchor,
  Button,
  Group,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import classes from './MapViewPage.module.css';

interface MapSidebarProps {
  name: string;
  error: string | null;
  // Пределы и текущее значение среза; null — карта ещё не загружена или пустая.
  cut: { min: number; max: number; value: number } | null;
  onCutChange: (y: number) => void;
  // Карта загружена, но в ней нет ни одного блока.
  empty: boolean;
  building: boolean;
  onBuildDemo: () => void;
  sceneReady: boolean;
}

// Правая панель страницы карты: всё управление, чтобы сцена занимала остальной экран.
function MapSidebar({
  name,
  error,
  cut,
  onCutChange,
  empty,
  building,
  onBuildDemo,
  sceneReady,
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

        {error && (
          <Alert color="red" title="Ошибка">
            {error}
          </Alert>
        )}

        {empty && (
          <Stack align="flex-start" gap="sm">
            <Text c="dimmed" size="sm">
              Карта пустая. Редактор блоков появится позже — пока можно
              построить демо-деревню и посмотреть на неё.
            </Text>
            <Button loading={building} onClick={onBuildDemo}>
              Построить демо-деревню
            </Button>
          </Stack>
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

        {/* «Сцена готова» — сигнал для агента в браузере, что снимок можно делать. */}
        {cut && (
          <Text size="xs" c="dimmed">
            {sceneReady
              ? 'Сцена готова. Левая кнопка мыши — перемещение, правая — поворот, колесо — масштаб.'
              : 'Загрузка сцены…'}
          </Text>
        )}
      </Stack>
    </aside>
  );
}

export default MapSidebar;
