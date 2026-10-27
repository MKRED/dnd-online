import { ActionIcon, Chip, Group, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import CardTitle from './CardTitle';
import type { CardView } from './CardWindows';
import classes from './CardWindows.module.css';
import type { CardWindows } from './useCardWindows';

// Карточки на телефоне (docs/plan/done/scene-page.md, «Карточка существа»): лист снизу почти на
// весь экран, сверху — чипы открытых, щелчок переключает. Свёрнутый лист — одна шапка,
// сцена над ним живая. Чипы — от новой к старой: открытая слева и видна сразу, а не
// уезжает в конец строки (замечание Михаила, 2026-10-27).
function CardSheet({
  views,
  windows,
}: {
  views: CardView[];
  windows: CardWindows;
}) {
  const current = views.at(-1);
  const chips = useRef<HTMLDivElement>(null);
  const currentKey = current?.window.key;
  // Открытая встаёт первой: строку, пролистанную вбок, вернуть к началу.
  useEffect(() => {
    if (chips.current) chips.current.scrollLeft = 0;
  }, [currentKey]);
  if (!current) return null;
  const { window, title, href, subtitle, portrait, body } = current;
  return (
    <section className={classes.sheet} aria-label={`Карточка: ${title}`}>
      <div className={classes.grab} />
      {views.length > 1 && (
        <Group
          ref={chips}
          gap={6}
          px="xs"
          pb={6}
          wrap="nowrap"
          className={classes.chips}
        >
          {views.toReversed().map((view) => (
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
          <CardTitle title={title} href={href} />
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
