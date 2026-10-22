import { ActionIcon, Paper, Tooltip, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useEffect, useRef, type PointerEvent } from 'react';
import { useKeyCodes } from '../useKeyCodes';
import {
  clampLevel,
  fractionToLevel,
  levelToFraction,
  tickLevels,
} from './cutTrack';
import classes from './CutRuler.module.css';

interface CutRulerProps {
  // Нижний и верхний уровни с блоками; срез на верхнем — «без среза», видно всё.
  min: number;
  max: number;
  value: number;
  onChange: (level: number) => void;
}

const HELP =
  'Срез по высоте: всё выше уровня не рисуется — так видно, что внутри зданий и на нижних этажах.';

// Срез по высоте — вертикальная шкала у правого края сцены, под «Центром»: и в
// редакторе карты, и на сцене игры. Клавиши [ и ] опускают и поднимают срез, колесо
// над шкалой — тоже; «Всё» снимает срез.
function CutRuler({ min, max, value, onChange }: CutRulerProps) {
  const track = useRef<HTMLDivElement>(null);
  const level = clampLevel(value, min, max);
  const all = level >= max;
  const step = (dy: number) => onChange(clampLevel(level + dy, min, max));

  useKeyCodes({
    BracketLeft: () => step(-1),
    BracketRight: () => step(1),
  });

  // Колесо над шкалой двигает срез, а не масштабирует сцену под ней: обработчик
  // не пассивный, иначе preventDefault не работает. Свежий step — через ref.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stepRef.current(event.deltaY < 0 ? 1 : -1);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const levelAt = (clientY: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return level;
    return fractionToLevel((rect.bottom - clientY) / rect.height, min, max);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange(levelAt(event.clientY));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const next = levelAt(event.clientY);
    if (next !== level) onChange(next);
  };

  const percent = (y: number) => `${levelToFraction(y, min, max) * 100}%`;

  return (
    <Paper className={classes.ruler} withBorder shadow="xs" p={4}>
      <Tooltip label="Показать всё" position="left" withArrow>
        <UnstyledButton
          className={classes.all}
          data-active={all || undefined}
          aria-pressed={all}
          onClick={() => onChange(max)}
        >
          Всё
        </UnstyledButton>
      </Tooltip>
      <Tooltip label="Поднять срез (])" position="left" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Поднять срез"
          disabled={all}
          onClick={() => step(1)}
        >
          <IconChevronUp size={16} stroke={2} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={HELP} position="left" multiline w={240} withArrow>
        <div
          ref={track}
          className={classes.track}
          role="slider"
          tabIndex={0}
          aria-label="Срез по высоте"
          aria-orientation="vertical"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={level}
          aria-valuetext={all ? 'Без среза' : `Уровень ${level}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={(event) => {
            const moves: Record<string, number> = {
              ArrowUp: 1,
              ArrowRight: 1,
              ArrowDown: -1,
              ArrowLeft: -1,
              PageUp: 5,
              PageDown: -5,
              Home: min - level,
              End: max - level,
            };
            if (!(event.key in moves)) return;
            event.preventDefault();
            step(moves[event.key]);
          }}
        >
          <div className={classes.rail} />
          <div className={classes.shown} style={{ height: percent(level) }} />
          {tickLevels(min, max).map((y) => (
            <div
              key={y}
              className={classes.tick}
              data-hidden={y > level || undefined}
              style={{ bottom: percent(y) }}
            />
          ))}
          <div
            className={classes.thumb}
            data-all={all || undefined}
            style={{ bottom: percent(level) }}
          >
            {level}
          </div>
        </div>
      </Tooltip>

      <Tooltip label="Опустить срез ([)" position="left" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Опустить срез"
          disabled={level <= min}
          onClick={() => step(-1)}
        >
          <IconChevronDown size={16} stroke={2} />
        </ActionIcon>
      </Tooltip>
    </Paper>
  );
}

export default CutRuler;
