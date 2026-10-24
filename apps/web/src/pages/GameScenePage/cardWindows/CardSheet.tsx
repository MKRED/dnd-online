import { ActionIcon, Chip, Group, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react';
import type { CardView } from './CardWindows';
import classes from './CardWindows.module.css';
import type { CardWindows } from './useCardWindows';

// Карточки на телефоне (docs/plan/scene-page.md, «Карточка существа»): лист снизу почти на
// весь экран, сверху — чипы открытых, щелчок переключает. Свёрнутый лист — одна шапка,
// сцена над ним живая.
function CardSheet({
  views,
  windows,
}: {
  views: CardView[];
  windows: CardWindows;
}) {
  const current = views.at(-1);
  if (!current) return null;
  const { window, title, subtitle, portrait, body } = current;
  return (
    <section className={classes.sheet} aria-label={`Карточка: ${title}`}>
      <div className={classes.grab} />
      {views.length > 1 && (
        <Group
          gap={6}
          px="xs"
          pb={6}
          wrap="nowrap"
          style={{ overflowX: 'auto' }}
        >
          {views.map((view) => (
            <Chip
              key={view.window.key}
              size="xs"
              checked={view === current}
              onChange={() => windows.raise(view.window.key)}
            >
              {view.title}
            </Chip>
          ))}
        </Group>
      )}
      <div className={classes.header} style={{ cursor: 'default' }}>
        {portrait}
        <div className={classes.heading}>
          <Text fw={600} truncate>
            {title}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {subtitle}
          </Text>
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label={
            window.minimized ? 'Развернуть карточку' : 'Свернуть карточку'
          }
          onClick={() =>
            windows.update(window.key, { minimized: !window.minimized })
          }
        >
          {window.minimized ? (
            <IconChevronUp size={18} />
          ) : (
            <IconChevronDown size={18} />
          )}
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Закрыть карточку"
          onClick={() => windows.close(window.key)}
        >
          <IconX size={18} />
        </ActionIcon>
      </div>
      {!window.minimized && <div className={classes.body}>{body}</div>}
    </section>
  );
}

export default CardSheet;
