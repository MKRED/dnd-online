import { Button, Group, SegmentedControl, Text } from '@mantine/core';
import { useState } from 'react';
import type { SpellSlots } from 'shared';
import { freeSlotLevels, type TurnTile } from './turnTiles';
import classes from './TurnPanel.module.css';

interface TurnConfirmProps {
  tile: TurnTile;
  slots: SpellSlots | null;
  busy: boolean;
  onAction: () => void;
  onAbility: (slotLevel: number | null) => void;
  onCancel: () => void;
}

// Под выбранным значком (решение Михаила 2026-10-27, вопрос 2, вариант А): что он делает и
// кнопка, которая это делает. У заклинания с ячейкой — выбор круга, по умолчанию самый
// низкий свободный. Нельзя сейчас — вместо кнопки причина.
function TurnConfirm({
  tile,
  slots,
  busy,
  onAction,
  onAbility,
  onCancel,
}: TurnConfirmProps) {
  const { use } = tile;
  const levels =
    use.kind === 'ability' && use.slotMin !== null
      ? freeSlotLevels(slots, use.slotMin)
      : [];
  const [level, setLevel] = useState<number | null>(levels[0] ?? null);
  const cancel = (
    <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
      Отмена
    </Button>
  );
  return (
    <div className={classes.confirm}>
      <Text size="sm">{tile.tip}</Text>
      {tile.block ? (
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
            {tile.block}
          </Text>
          {cancel}
        </Group>
      ) : (
        <>
          {levels.length > 1 && (
            <SegmentedControl
              size="xs"
              aria-label="Круг ячейки"
              value={String(level)}
              onChange={(v) => setLevel(Number(v))}
              data={levels.map((l) => ({
                value: String(l),
                label: `${l} круг`,
              }))}
            />
          )}
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              loading={busy}
              onClick={() =>
                use.kind === 'action' ? onAction() : onAbility(level)
              }
            >
              {use.kind === 'action'
                ? tile.name
                : level === null
                  ? 'Применить'
                  : `Применить, ячейка ${level} круга`}
            </Button>
            {cancel}
          </Group>
        </>
      )}
    </div>
  );
}

export default TurnConfirm;
