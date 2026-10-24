import { Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconRefresh, IconSwords } from '@tabler/icons-react';
import type { GameMoveMode } from 'shared';

interface CombatControlsProps {
  mode: GameMoveMode;
  round: number | null;
  onMode: (mode: GameMoveMode) => void;
  onRound: () => void;
  busy: boolean;
}

// Бой мастера наверху «Участников» (docs/dnd/movement.md, «Free and tactical modes»;
// макет «Режимы хода на сцене», вариант В): вне боя — одна кнопка «Начать бой», в бою —
// номер раунда, «Новый раунд» и «Закончить бой».
function CombatControls({
  mode,
  round,
  onMode,
  onRound,
  busy,
}: CombatControlsProps) {
  if (mode === 'free') {
    return (
      <Group justify="flex-end" pb={4}>
        <Tooltip
          label="Тактический режим: у всех новый ход, дальше запас тратится до нового раунда"
          withArrow
          multiline
          w={260}
        >
          <Button
            size="xs"
            leftSection={<IconSwords size={15} />}
            onClick={() => onMode('tactical')}
            disabled={busy}
          >
            Начать бой
          </Button>
        </Tooltip>
      </Group>
    );
  }
  // В бою «Новый раунд» — самое частое действие: во всю ширину под строкой боя.
  return (
    <Stack gap={6} pb={4}>
      <Group gap={6} wrap="nowrap" justify="space-between">
        <Text
          size="sm"
          fw={600}
          c="var(--mantine-primary-color-filled)"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <IconSwords size={15} />
          Бой · раунд {round ?? 1}
        </Text>
        <Tooltip
          label="Свободный режим: запас снова полный после каждого хода"
          withArrow
          multiline
          w={240}
        >
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => onMode('free')}
            disabled={busy}
          >
            Закончить бой
          </Button>
        </Tooltip>
      </Group>
      <Tooltip label="Запас движения всех снова полный" withArrow>
        <Button
          size="xs"
          variant="default"
          fullWidth
          leftSection={<IconRefresh size={15} />}
          onClick={onRound}
          disabled={busy}
        >
          Новый раунд
        </Button>
      </Tooltip>
    </Stack>
  );
}

export default CombatControls;
