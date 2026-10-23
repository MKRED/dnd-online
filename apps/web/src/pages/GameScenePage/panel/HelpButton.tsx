import {
  ActionIcon,
  Group,
  Kbd,
  Popover,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconHelpCircle } from '@tabler/icons-react';

interface HelpButtonProps {
  master: boolean;
  editing: boolean;
}

type Line = [keys: string[], what: string];

const CAMERA: Line[] = [
  [['ЛКМ'], 'двигать камеру'],
  [['ПКМ'], 'поворачивать'],
  [['Колесо'], 'масштаб к курсору'],
  [['Двойной клик'], 'центр вращения сюда'],
  [['Q', 'E'], 'опустить и поднять центр'],
];

const PLAY: Line[] = [
  [['Клик'], 'выбрать фигурку, щелчок по подсвеченной клетке — ход'],
  [['Esc'], 'снять выбор'],
];

const MASTER: Line[] = [
  [['Ё'], 'режим «Игра» или «Правка»'],
  [['Ctrl', 'Z'], 'отменить правку или ход'],
  [['Ctrl', 'Shift', 'Z'], 'вернуть'],
];

const EDIT: Line[] = [
  [['1–6'], 'инструменты по порядку полосы'],
  [['B'], 'окно «Что поставить»'],
  [['R'], 'повернуть блок или объект'],
  [['Del'], 'удалить выделенный объект'],
];

function Section({ title, lines }: { title: string; lines: Line[] }) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {title}
      </Text>
      {lines.map(([keys, what]) => (
        <Group key={what} gap={8} wrap="nowrap" align="baseline">
          <Group gap={2} wrap="nowrap" w={112} style={{ flex: 'none' }}>
            {keys.map((key) => (
              <Kbd key={key} size="xs">
                {key}
              </Kbd>
            ))}
          </Group>
          <Text size="sm">{what}</Text>
        </Group>
      ))}
    </Stack>
  );
}

// Подсказки и горячие клавиши одной кнопкой «?» (docs/plan/scene-page.md, «Правая
// панель»): длинные пояснения больше не стоят текстом под каждым переключателем.
function HelpButton({ master, editing }: HelpButtonProps) {
  return (
    <Popover position="left-start" withArrow shadow="md" width={340}>
      <Popover.Target>
        <Tooltip label="Подсказки и горячие клавиши" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Подсказки и горячие клавиши"
          >
            <IconHelpCircle size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Section title="Камера" lines={CAMERA} />
          {!editing && <Section title="Ход" lines={PLAY} />}
          {master && <Section title="Мастер" lines={MASTER} />}
          {editing && <Section title="Правка" lines={EDIT} />}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default HelpButton;
