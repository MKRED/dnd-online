import { Button, Group, NumberInput, Select, Stack, Text } from '@mantine/core';
import { CREATURE_SIZES, type CreatureSize } from 'shared';
import type { WalkTest } from './useWalkTest';

const SIZE_OPTIONS = Object.entries(CREATURE_SIZES).map(([value, size]) => ({
  value,
  label: size.label,
}));

const isSize = (value: string): value is CreatureSize =>
  value in CREATURE_SIZES;

// Настройки проверки хода в панели редактора.
function WalkTestPanel({ walk }: { walk: WalkTest }) {
  const { token } = walk;
  return (
    <Stack gap="sm">
      <Group gap="xs" grow align="flex-start">
        <Select
          label="Размер"
          data={SIZE_OPTIONS}
          value={walk.size}
          onChange={(value) => value && isSize(value) && walk.setSize(value)}
          allowDeselect={false}
        />
        {/* Выше 120 футов поиск досягаемости на открытом поле уже дольше 100 мс. */}
        <NumberInput
          label="Скорость, футов"
          min={5}
          max={120}
          step={5}
          value={walk.speed}
          onChange={(value) => walk.setSpeed(Math.max(5, Number(value) || 5))}
        />
      </Group>

      {token && (
        <Text size="sm" c={token.ok ? undefined : 'red'}>
          {token.ok
            ? `Потрачено ${walk.spent} из ${walk.speed} футов`
            : 'Здесь фигурке этого размера не встать'}
        </Text>
      )}

      {token && (
        <Group gap="xs" grow>
          <Button variant="default" size="xs" onClick={walk.newTurn}>
            Новый ход
          </Button>
          <Button variant="default" size="xs" onClick={walk.remove}>
            Убрать фигурку
          </Button>
        </Group>
      )}
    </Stack>
  );
}

export default WalkTestPanel;
