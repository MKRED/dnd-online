import { Button, Group, NumberInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { HIT_POINTS_CHANGE_MAX, type GameCreatureChange } from 'shared';

interface HitPointsControlsProps {
  current: number;
  max: number;
  temp: number;
  busy: boolean;
  onChange: (change: GameCreatureChange) => void;
}

// Хиты в карточке существа (docs/plan/game.md, этап 8): число и три действия над ним.
// Сервер считает новое состояние сам — урон сначала снимает временные хиты, лечение не
// выше максимума (docs/dnd/hit-points.md). Временные хиты не складываются: кнопка ставит
// их числом, 0 убирает.
function HitPointsControls({
  current,
  max,
  temp,
  busy,
  onChange,
}: HitPointsControlsProps) {
  const [amount, setAmount] = useState<number | string>('');
  const value = typeof amount === 'number' ? amount : null;
  const send = (kind: GameCreatureChange['kind']) => {
    if (value === null) return;
    onChange({ kind, amount: value });
    setAmount('');
  };

  return (
    <Stack gap={6}>
      <Group gap="xs" align="baseline">
        <Text fw={700} size="lg">
          ХП {current} / {max}
        </Text>
        {temp > 0 && (
          <Text size="sm" c="dimmed">
            +{temp} временных
          </Text>
        )}
      </Group>
      <NumberInput
        aria-label="Сколько хитов"
        placeholder="Сколько"
        size="xs"
        min={0}
        max={HIT_POINTS_CHANGE_MAX}
        allowDecimal={false}
        allowNegative={false}
        value={amount}
        onChange={setAmount}
        onKeyDown={(event) => {
          // Enter — самое частое: урон.
          if (event.key === 'Enter') send('damage');
        }}
      />
      <Group gap={4}>
        <Button
          size="compact-xs"
          px={6}
          color="red"
          variant="light"
          disabled={busy || value === null}
          onClick={() => send('damage')}
        >
          Урон
        </Button>
        <Button
          size="compact-xs"
          px={6}
          color="teal"
          variant="light"
          disabled={busy || value === null}
          onClick={() => send('heal')}
        >
          Лечение
        </Button>
        <Button
          size="compact-xs"
          px={6}
          variant="light"
          disabled={busy || value === null}
          onClick={() => send('temp')}
          title="Временные хиты не складываются: число встанет вместо прежних"
        >
          Временные
        </Button>
      </Group>
    </Stack>
  );
}

export default HitPointsControls;
