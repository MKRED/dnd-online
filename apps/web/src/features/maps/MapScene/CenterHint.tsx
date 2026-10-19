import { ActionIcon, Group, Paper, Text, Tooltip } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import classes from './MapScene.module.css';

interface CenterHintProps {
  // Уровень точки вращения; null — камера ещё не готова.
  level: number | null;
  onShift: (dy: number) => void;
}

const HELP =
  'Вокруг этой точки вращается камера. Двойной клик в «Просмотре» или Alt+клик в любом инструменте переносит её туда, где курсор; Q и E опускают и поднимают её.';

// Подсказка «Центр: y = N» поверх сцены. Кнопки ▲▼ — для телефона, где нет Q/E.
function CenterHint({ level, onShift }: CenterHintProps) {
  if (level === null) return null;
  return (
    <Paper className={classes.centerHint} withBorder shadow="xs" px={6} py={2}>
      <Group gap={4} wrap="nowrap">
        <Tooltip label={HELP} multiline w={260} withArrow>
          <Text size="sm" fw={500}>
            Центр: y = {level}
          </Text>
        </Tooltip>
        <Tooltip label="Поднять центр (E)" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label="Поднять центр"
            onClick={() => onShift(1)}
          >
            <IconChevronUp size={16} stroke={2} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Опустить центр (Q)" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label="Опустить центр"
            onClick={() => onShift(-1)}
          >
            <IconChevronDown size={16} stroke={2} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}

export default CenterHint;
