import {
  Accordion,
  ActionIcon,
  Drawer,
  Group,
  Kbd,
  Popover,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconHelpCircle } from '@tabler/icons-react';
import { useState } from 'react';

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

const MASTER: Line[] = [[['Ё'], 'режим «Игра» или «Правка»']];

// Отмена — только в «Правке», и для хода из «Игры» тоже: история общая.
const EDIT: Line[] = [
  [['Ctrl', 'Z'], 'отменить правку или ход'],
  [['Ctrl', 'Shift', 'Z'], 'вернуть'],
  [['1–5'], 'инструменты по порядку полосы (3 ещё раз — режим «Строить»)'],
  [['B'], 'окно «Что поставить» или «Какое существо поставить»'],
  [['R'], 'повернуть блок, объект или существо'],
  [['Del'], 'удалить выделенный объект или существо'],
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

// Жесты на телефоне: у MapControls один палец двигает, два — поворачивают и приближают.
const GESTURES: Line[] = [
  [['Один палец'], 'двигать камеру'],
  [['Два пальца'], 'поворот и масштаб'],
  [['Двойное касание'], 'центр вращения сюда'],
  [['Касание'], 'выбрать; касание по подсвеченной клетке — ход'],
];

// Подсказки и горячие клавиши одной кнопкой «?» (docs/plan/done/scene-page.md, «Правая
// панель»): длинные пояснения больше не стоят текстом под каждым переключателем. На
// телефоне — лист снизу с жестами, клавиши свёрнуты (окошко уходило за край экрана).
function HelpButton({ master, editing }: HelpButtonProps) {
  const narrow = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);
  const keys = (
    <Stack gap="sm">
      <Section title="Камера" lines={CAMERA} />
      {!editing && <Section title="Ход" lines={PLAY} />}
      {master && <Section title="Мастер" lines={MASTER} />}
      {editing && <Section title="Правка" lines={EDIT} />}
    </Stack>
  );
  const button = (
    <ActionIcon
      variant="subtle"
      color="gray"
      aria-label="Подсказки и горячие клавиши"
      // Открытие — своим состоянием: через Tooltip внутри Popover.Target щелчок до
      // окошка не доходил, и на компьютере «?» не открывалась.
      onClick={() => setOpened((open) => !open)}
    >
      <IconHelpCircle size={18} />
    </ActionIcon>
  );

  if (narrow) {
    return (
      <>
        {button}
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          position="bottom"
          size={380}
          title="Жесты"
          radius="md"
        >
          <Stack gap="md" pb="md">
            <Section title="Сцена" lines={GESTURES} />
            <Accordion variant="contained">
              <Accordion.Item value="keys">
                <Accordion.Control>Клавиши (с клавиатурой)</Accordion.Control>
                <Accordion.Panel>{keys}</Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Drawer>
      </>
    );
  }
  return (
    <Popover
      position="left-start"
      withArrow
      shadow="md"
      width={340}
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <Tooltip label="Подсказки и горячие клавиши" withArrow>
          {button}
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>{keys}</Popover.Dropdown>
    </Popover>
  );
}

export default HelpButton;
