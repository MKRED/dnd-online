import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { MIN_CARD_HEIGHT } from './cardHeight';
import classes from './CardWindows.module.css';

interface CardResizeGripProps {
  // Высота окна сейчас, px: от неё тянут.
  current: () => number;
  // done — отпустили: эту высоту запомнить для следующих окон.
  onResize: (height: number, done: boolean) => void;
  onFit: () => void;
}

// Клавишами — шагами по 40 px, как прокрутка стрелками.
const KEY_STEP = 40;

// Полоска внизу окна карточки: тянут — меняется высота, двойной щелчок (или Enter) —
// по содержимому. Ширина не меняется (вариант А).
function CardResizeGrip({ current, onResize, onFit }: CardResizeGripProps) {
  const start = useRef<{ y: number; height: number } | null>(null);
  const heightAt = (event: PointerEvent<HTMLDivElement>) =>
    start.current
      ? Math.max(
          MIN_CARD_HEIGHT,
          start.current.height + event.clientY - start.current.y,
        )
      : null;

  const down = (event: PointerEvent<HTMLDivElement>) => {
    // Без этого двойной щелчок выделяет текст карточки, и следующее перетаскивание браузер
    // начинает как перенос выделенного: pointercancel обрывает его на первом шаге.
    event.preventDefault();
    start.current = { y: event.clientY, height: current() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const height = heightAt(event);
    if (height !== null) onResize(height, false);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const height = heightAt(event);
    const from = start.current?.height;
    start.current = null;
    // Щелчок без сдвига — не правка высоты: иначе двойной щелчок сначала запомнил бы её.
    if (height !== null && height !== from) onResize(height, true);
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowDown'
        ? KEY_STEP
        : event.key === 'ArrowUp'
          ? -KEY_STEP
          : 0;
    if (event.key === 'Enter') {
      event.preventDefault();
      onFit();
    } else if (step !== 0) {
      event.preventDefault();
      onResize(Math.max(MIN_CARD_HEIGHT, current() + step), true);
    }
  };

  return (
    <div
      className={classes.grip}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Высота карточки"
      title="Тяните, чтобы изменить высоту; двойной щелчок — по содержимому"
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null;
      }}
      onDoubleClick={onFit}
      onKeyDown={key}
    />
  );
}

export default CardResizeGrip;
