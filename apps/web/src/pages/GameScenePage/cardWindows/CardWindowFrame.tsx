import { ActionIcon, Paper, Text, Tooltip } from '@mantine/core';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import CardTitle from './CardTitle';
import classes from './CardWindows.module.css';

interface CardWindowFrameProps {
  title: string;
  // Полная страница существа или предмета; null — ссылки нет.
  href: string | null;
  subtitle: string;
  portrait: ReactNode;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
  onMove: (x: number, y: number) => void;
  onMinimize: (minimized: boolean) => void;
  onClose: () => void;
  onRaise: () => void;
  children: ReactNode;
}

// Окно карточки на компьютере (docs/plan/done/scene-page.md, этап 4): не модальное, сцена под
// ним живая. Тянется за шапку, сворачивается в шапку, щелчок поднимает его над другими.
function CardWindowFrame({
  title,
  href,
  subtitle,
  portrait,
  x,
  y,
  z,
  minimized,
  onMove,
  onMinimize,
  onClose,
  onRaise,
  children,
}: CardWindowFrameProps) {
  // Откуда тянут: смещение курсора от угла окна в начале перетаскивания.
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    // Кнопки шапки и ссылка-имя не тянут окно.
    if ((event.target as HTMLElement).closest('button, a')) return;
    grab.current = { dx: event.clientX - x, dy: event.clientY - y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!grab.current) return;
    // Шапка не уходит за верх и левый край сцены: иначе окно не вытащить обратно.
    onMove(
      Math.max(0, event.clientX - grab.current.dx),
      Math.max(0, event.clientY - grab.current.dy),
    );
  };
  const stopDrag = () => {
    grab.current = null;
  };

  return (
    <Paper
      className={classes.window}
      // Низ окна — не ниже низа сцены, сколько бы его ни опустили.
      style={{
        left: x,
        top: y,
        zIndex: 20 + z,
        maxHeight: `calc(100% - ${y + 16}px)`,
      }}
      withBorder
      shadow="xl"
      role="dialog"
      aria-label={`Карточка: ${title}`}
      onPointerDownCapture={onRaise}
    >
      <div
        className={classes.header}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        {portrait}
        <div className={classes.heading}>
          <CardTitle title={title} href={href} />
          <Text size="xs" c="dimmed" truncate>
            {subtitle}
          </Text>
        </div>
        <Tooltip label={minimized ? 'Развернуть' : 'Свернуть'} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={minimized ? 'Развернуть карточку' : 'Свернуть карточку'}
            onClick={() => onMinimize(!minimized)}
          >
            {minimized ? <IconSquare size={16} /> : <IconMinus size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Закрыть" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Закрыть карточку"
            onClick={onClose}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </div>
      {!minimized && <div className={classes.body}>{children}</div>}
    </Paper>
  );
}

export default CardWindowFrame;
