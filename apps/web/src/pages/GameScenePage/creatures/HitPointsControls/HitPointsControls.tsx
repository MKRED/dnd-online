import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { damageTotal, type GameCreatureChange } from 'shared';
import DamagePartRow from './DamagePartRow';
import {
  canAddRow,
  clearedRows,
  EMPTY_ROW,
  filledParts,
  type DamageRow,
} from './damageRows';

interface HitPointsControlsProps {
  current: number;
  max: number;
  temp: number;
  busy: boolean;
  onChange: (change: GameCreatureChange) => void;
}

// Хиты в карточке существа (docs/plan/done/game.md, этап 8): строки «число + тип» и три
// действия над ними. Урон бывает смешанным — строк до пяти, «+ ещё тип» добавляет
// (вариант 1, 2026-10-26); лечение и временные хиты берут сумму. Сервер считает новое
// состояние сам — урон сначала снимает временные хиты, лечение не выше максимума
// (docs/dnd/hit-points.md). Временные хиты не складываются: кнопка ставит их числом, 0
// убирает.
function HitPointsControls({
  current,
  max,
  temp,
  busy,
  onChange,
}: HitPointsControlsProps) {
  const [rows, setRows] = useState<DamageRow[]>([EMPTY_ROW]);
  const parts = filledParts(rows);
  const total = damageTotal(parts);
  const empty = parts.length === 0;
  const send = (kind: GameCreatureChange['kind']) => {
    if (empty) return;
    onChange(
      kind === 'damage'
        ? { kind, amount: total, parts }
        : { kind, amount: total },
    );
    setRows(clearedRows);
  };
  const setRow = (index: number, row: DamageRow) =>
    setRows((all) => all.map((old, i) => (i === index ? row : old)));
  const removeRow = (index: number) =>
    setRows((all) => all.filter((_, i) => i !== index));

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
      {rows.map((row, index) => (
        <DamagePartRow
          key={index}
          row={row}
          index={index}
          onChange={(next) => setRow(index, next)}
          onRemove={rows.length > 1 ? () => removeRow(index) : undefined}
          onEnter={() => send('damage')}
        />
      ))}
      <Group justify="space-between" gap={4}>
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<IconPlus size={12} />}
          disabled={!canAddRow(rows)}
          onClick={() => setRows((all) => [...all, EMPTY_ROW])}
          title="Смешанный урон: часть другого типа отдельной строкой"
        >
          ещё тип
        </Button>
        {rows.length > 1 && (
          <Text size="xs" c="dimmed">
            всего <b>{total}</b>
          </Text>
        )}
      </Group>
      <Group gap={4}>
        <Button
          size="compact-xs"
          px={6}
          color="red"
          variant="light"
          disabled={busy || empty}
          onClick={() => send('damage')}
        >
          Урон
        </Button>
        <Button
          size="compact-xs"
          px={6}
          color="teal"
          variant="light"
          disabled={busy || empty}
          onClick={() => send('heal')}
        >
          Лечение
        </Button>
        <Button
          size="compact-xs"
          px={6}
          variant="light"
          disabled={busy || empty}
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
